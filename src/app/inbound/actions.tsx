"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export async function submitInboundAction(formData: any, submissions: any[]) {
  const supabase = await createClient();

  // 1. Ambil User untuk log performed_by
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  // 2. Generate Transaction Code (Contoh: INB-20251230-0001)
  const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const { count } = await supabase
    .from("inbound_history")
    .select("*", { count: "exact", head: true })
    .gte("created_at", new Date().toISOString().slice(0, 10));
  
  const sequence = String((count || 0) + 1).padStart(4, "0");
  const transactionCode = `INB-${todayStr}-${sequence}`;

  // --- MULAI TRANSAKSI MANUAL (Supabase RPC atau Multiple Inserts) ---
  
  // A. Simpan ke inbound_history
  const { data: inboundEntry, error: errHistory } = await supabase
    .from("inbound_history")
    .insert({
      warehouse_id: formData.warehouse_id,
      transaction_code: transactionCode,
      product_id: formData.product_id,
      bb_produk: formData.bb_produk,
      qty_carton: formData.total_qty_carton,
      expired_date: formData.expired_date,
      locations: submissions.map(s => {
          const parts = s.location.split('-');
          return {
              cluster: parts[0],
              lorong: parseInt(parts[1].replace('L','')),
              baris: parseInt(parts[2].replace('B','')),
              level: parseInt(parts[3].replace('P','')),
              qtyCarton: s.qtyCarton,
              isReceh: s.isReceh
          };
      }),
      expedition_id: formData.ekspedisi,
      driver_name: formData.namaPengemudi,
      vehicle_number: formData.nomorPolisi,
      dn_number: formData.noDN,
      received_by: user.id,
      arrival_time: new Date().toISOString()
    })
    .select()
    .single();

  if (errHistory) return { success: false, message: errHistory.message };

  // B. Loop untuk simpan ke stock_list dan stock_movements
  for (const sub of submissions) {
    const locParts = sub.location.split('-');
    
    // 1. Insert ke stock_list (Trigger otomatis akan mengisi status)
    const { data: newStock, error: errStock } = await supabase
      .from("stock_list")
      .insert({
        warehouse_id: formData.warehouse_id,
        product_id: formData.product_id,
        bb_produk: formData.bb_produk,
        cluster: locParts[0],
        lorong: parseInt(locParts[1].replace('L','')),
        baris: parseInt(locParts[2].replace('B','')),
        level: parseInt(locParts[3].replace('P','')),
        qty_pallet: 1,
        qty_carton: sub.qtyCarton,
        expired_date: formData.expired_date,
        inbound_date: new Date().toISOString().slice(0, 10),
        created_by: user.id
      })
      .select()
      .single();

    if (errStock) continue; // Log error jika perlu

    // 2. Insert ke stock_movements (Audit Log)
    await supabase.from("stock_movements").insert({
      warehouse_id: formData.warehouse_id,
      stock_id: newStock.id,
      product_id: formData.product_id,
      bb_produk: formData.bb_produk,
      movement_type: "inbound",
      reference_type: "inbound_history",
      reference_id: inboundEntry.id,
      qty_before: 0,
      qty_change: sub.qtyCarton,
      qty_after: sub.qtyCarton,
      to_location: sub.location,
      performed_by: user.id,
      notes: "Inbound via Form"
    });
  }

  revalidatePath("/stock-list");
  revalidatePath("/inbound");
  return { success: true, transactionCode };
}

// Cancel/Batal Transaksi Inbound
export async function cancelInboundAction(inboundHistoryId: string) {
  const supabase = await createClient();

  // 1. Ambil User untuk log
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  // 2. Ambil data inbound_history untuk mendapatkan lokasi dan qty
  const { data: inboundData, error: errFetch } = await supabase
    .from("inbound_history")
    .select("*")
    .eq("id", inboundHistoryId)
    .single();

  if (errFetch || !inboundData) {
    return { success: false, message: "Data inbound tidak ditemukan" };
  }

  // 3. Loop melalui setiap lokasi dan kurangi/hapus stock_list
  for (const loc of inboundData.locations) {
    const { cluster, lorong, baris, level, qtyCarton } = loc;

    // Cari stock_list yang sesuai
    const { data: stockItems, error: errStock } = await supabase
      .from("stock_list")
      .select("*")
      .eq("warehouse_id", inboundData.warehouse_id)
      .eq("product_id", inboundData.product_id)
      .eq("bb_produk", inboundData.bb_produk)
      .eq("cluster", cluster)
      .eq("lorong", lorong)
      .eq("baris", baris)
      .eq("level", level)
      .order("created_at", { ascending: false });

    if (errStock || !stockItems || stockItems.length === 0) continue;

    const stockItem = stockItems[0];

    // Log stock movement untuk pembatalan
    await supabase.from("stock_movements").insert({
      warehouse_id: inboundData.warehouse_id,
      stock_id: stockItem.id,
      product_id: inboundData.product_id,
      bb_produk: inboundData.bb_produk,
      movement_type: "cancel_inbound",
      reference_type: "inbound_history",
      reference_id: inboundHistoryId,
      qty_before: stockItem.qty_carton,
      qty_change: -qtyCarton,
      qty_after: stockItem.qty_carton - qtyCarton,
      from_location: `${cluster}-L${lorong}-B${baris}-P${level}`,
      performed_by: user.id,
      notes: `Pembatalan transaksi ${inboundData.transaction_code}`
    });

    // Update atau hapus stock_list
    if (stockItem.qty_carton <= qtyCarton) {
      // Hapus jika qty sama atau kurang
      await supabase
        .from("stock_list")
        .delete()
        .eq("id", stockItem.id);
    } else {
      // Kurangi qty jika masih ada sisa
      await supabase
        .from("stock_list")
        .update({ 
          qty_carton: stockItem.qty_carton - qtyCarton,
          updated_at: new Date().toISOString()
        })
        .eq("id", stockItem.id);
    }
  }

  // 4. Hapus record inbound_history (Hard delete)
  // CATATAN: Jika ingin soft delete, tambahkan fields: is_cancelled, cancelled_at, cancelled_by ke schema
  const { error: errDelete } = await supabase
    .from("inbound_history")
    .delete()
    .eq("id", inboundHistoryId);

  if (errDelete) {
    return { success: false, message: errDelete.message };
  }

  // Revalidate untuk refresh data
  revalidatePath("/inbound");
  revalidatePath("/stock-list");

  return { success: true, message: "Transaksi berhasil dibatalkan" };
}