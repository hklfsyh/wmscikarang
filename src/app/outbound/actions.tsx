"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

/**
 * Logika Pencarian Stok Berdasarkan FEFO (Server-Side)
 * Mengambil stok yang tersedia dan mengurutkannya berdasarkan expired_date terlama.
 */
export async function getFEFOAllocationAction(
  warehouseId: string,
  productId: string,
  totalCartonsNeeded: number
) {
  try {
    const supabase = await createClient();

    // 1. Ambil stok yang statusnya 'release' atau 'receh'
    // Diurutkan berdasarkan expired_date (Ascending) -> FEFO
    const { data: stocks, error } = await supabase
      .from("stock_list")
      .select("*")
      .eq("warehouse_id", warehouseId)
      .eq("product_id", productId)
      .in("status", ["release", "receh"])
      .order("expired_date", { ascending: true })
      .order("inbound_date", { ascending: true }); // Jika expired sama, ambil yang masuk duluan

    if (error) throw error;
    if (!stocks || stocks.length === 0)
      throw new Error("Stok produk tidak ditemukan.");

    let remainingNeeded = totalCartonsNeeded;
    const allocation = [];

    for (const stock of stocks) {
      if (remainingNeeded <= 0) break;

      const takeQty = Math.min(stock.qty_carton, remainingNeeded);

      allocation.push({
        stockId: stock.id,
        location: `${stock.cluster}-L${stock.lorong}-B${stock.baris}-P${stock.level}`,
        cluster: stock.cluster,
        lorong: stock.lorong,
        baris: stock.baris,
        level: stock.level,
        bbProduk: stock.bb_produk,
        expiredDate: stock.expired_date,
        qtyBefore: stock.qty_carton,
        qtyTaken: takeQty,
        qtyAfter: stock.qty_carton - takeQty,
        daysToExpire: Math.ceil(
          (new Date(stock.expired_date).getTime() - Date.now()) /
            (1000 * 3600 * 24)
        ),
      });

      remainingNeeded -= takeQty;
    }

    if (remainingNeeded > 0) {
      throw new Error(
        `Stok tidak mencukupi. Kurang ${remainingNeeded} karton lagi.`
      );
    }

    return { success: true, allocation };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Submit Outbound secara Real ke Database
 * Mengupdate/Menghapus stock_list dan mencatat history.
 */
export async function submitOutboundAction(formData: any, allocation: any[]) {
  const supabase = await createClient();

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Sesi berakhir.");

    // Ambil waktu lokal
    const localTime = new Date();
    const offset = localTime.getTimezoneOffset(); // Offset dalam menit
    const adjustedTime = new Date(localTime.getTime() - offset * 60 * 1000); // Sesuaikan ke waktu lokal

    // Format waktu ke ISO string
    const departureTime = adjustedTime
      .toISOString()
      .slice(0, 19)
      .replace("T", " ");

    // PERBAIKAN: Ambil semua BB unik dari alokasi dan gabungkan menjadi string koma
    const allBBs = Array.from(new Set(allocation.map((a) => a.bbProduk))).join(
      ", "
    );

    // 1. Generate Transaction Code
    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const { count } = await supabase
      .from("outbound_history")
      .select("*", { count: "exact", head: true })
      .gte("created_at", new Date().toISOString().slice(0, 10));

    const transactionCode = `OUT-${todayStr}-${String(
      (count || 0) + 1
    ).padStart(4, "0")}`;

    // 2. Simpan ke outbound_history dengan lokasi LENGKAP
    const { data: outboundEntry, error: errOut } = await supabase
      .from("outbound_history")
      .insert({
        warehouse_id: formData.warehouse_id,
        transaction_code: transactionCode,
        product_id: formData.product_id,
        bb_produk: allBBs, // Sekarang berisi "BB1, BB2"
        qty_carton: formData.total_qty_carton,
        locations: allocation.map((a) => ({
          cluster: a.cluster,
          lorung: a.lorung,
          baris: a.baris,
          level: a.level,
          qtyCarton: a.qtyTaken,
          bbProduk: a.bbProduk,
        })),
        driver_name: formData.namaPengemudi,
        vehicle_number: formData.nomorPolisi,
        processed_by: user.id,
        departure_time: departureTime, // Gunakan waktu lokal
      })
      .select()
      .single();

    if (errOut) throw errOut;

    // 3. Proses Update Stok & Movements
    for (const item of allocation) {
      // LOGIKA KRUSIAL: Pastikan tipe data qtyAfter adalah angka
      const qtySisa = Number(item.qtyAfter);

      if (qtySisa <= 0) {
        // Hapus jika benar-benar habis
        const { error: delErr } = await supabase
          .from("stock_list")
          .delete()
          .eq("id", item.stockId);
        if (delErr) console.error("Gagal hapus stok:", delErr);
      } else {
        // Update jika masih ada sisa
        await supabase
          .from("stock_list")
          .update({
            qty_carton: qtySisa,
            status: "receh",
            is_receh: true, // Pastikan ini true jika berubah jadi receh
          })
          .eq("id", item.stockId);
      }

      // Catat pergerakan
      await supabase.from("stock_movements").insert({
        warehouse_id: formData.warehouse_id,
        stock_id: item.stockId,
        product_id: formData.product_id,
        bb_produk: item.bbProduk,
        movement_type: "outbound",
        reference_type: "outbound_history",
        reference_id: outboundEntry.id,
        qty_before: item.qtyBefore,
        qty_change: -item.qtyTaken,
        qty_after: item.qtyAfter,
        from_location: item.location,
        performed_by: user.id,
        notes: "Outbound FEFO",
      });
    }

    revalidatePath("/stock-list");
    revalidatePath("/outbound");
    return { success: true, transactionCode };
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}
