"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { getIndonesianDateTime, getIndonesianDateString, getIndonesianDate } from "@/lib/utils/datetime";

/**
 * Fetch current real-time stock data from database
 * Used by client to get fresh data before FEFO recommendation
 */
export async function getCurrentStockAction(warehouseId: string) {
  try {
    const supabase = await createClient();
    
    const { data: stock, error } = await supabase
      .from("stock_list")
      .select("*")
      .eq("warehouse_id", warehouseId);

    if (error) throw error;

    return { success: true, stock: stock || [] };
  } catch (err: any) {
    return { success: false, error: err.message, stock: [] };
  }
}

export async function submitNplAction(formData: any, placements: any[]) {
  const supabase = await createClient();

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Sesi berakhir.");

    // 1. Generate Transaction Code NPL
    const todayStr = getIndonesianDateString();
    const { count } = await supabase
      .from("npl_history")
      .select("*", { count: "exact", head: true })
      .gte("created_at", getIndonesianDate());

    const transactionCode = `NPL-${todayStr}-${String(
      (count || 0) + 1
    ).padStart(4, "0")}`;

    // 2. Simpan ke npl_history dengan enhanced locations (include stock_id nanti)
    const enhancedPlacements = placements.map(loc => ({
      ...loc,
      original_created_at: loc.original_created_at || null  // Preserve untuk edit
    }));

    const { data: nplEntry, error: errNpl } = await supabase
      .from("npl_history")
      .insert({
        warehouse_id: formData.warehouseId,
        transaction_code: transactionCode,
        product_id: formData.productId,
        bb_produk: formData.bbProduk,
        qty_carton: formData.totalQty,
        expired_date: formData.expiredDate,
        locations: enhancedPlacements, // Data array dengan original_created_at
        driver_name: formData.driverName,
        vehicle_number: formData.vehicleNumber,
        returned_by: user.id,
        return_time: getIndonesianDateTime(),
        notes: formData.notes,
      })
      .select()
      .single();

    if (errNpl) throw errNpl;

    // 3. Simpan ke stock_list & stock_movements per lokasi
    const updatedLocations = [];
    for (const loc of placements) {
      // Tentukan status fisik (receh atau normal) - bukan fefo_status
      const physicalStatus = loc.isReceh ? "receh" : "normal";

      // PENTING: Jika ada original_created_at (dari edit), gunakan itu
      // Jika tidak, biarkan database menggunakan default now()
      const stockData: any = {
        warehouse_id: formData.warehouseId,
        product_id: formData.productId,
        bb_produk: formData.bbProduk,
        cluster: loc.cluster,
        lorong: loc.lorong,
        baris: loc.baris,
        level: loc.level,
        qty_pallet: 1,
        qty_carton: loc.qtyCarton,
        expired_date: formData.expiredDate,
        inbound_date: getIndonesianDate(),
        status: physicalStatus,
        fefo_status: "hold",  // Selalu 'hold' awal, biarkan trigger database menentukan
        is_receh: loc.isReceh,
        created_by: user.id,
      };

      // Restore original_created_at untuk menjaga urutan FEFO saat edit
      if (loc.original_created_at) {
        stockData.created_at = loc.original_created_at;
      }

      const { data: newStock, error: errStock } = await supabase
        .from("stock_list")
        .insert(stockData)
        .select()
        .single();

      if (errStock) throw errStock;

      // Simpan stock_id ke array untuk update npl_history.locations
      updatedLocations.push({
        ...loc,
        stock_id: newStock.id,
        original_created_at: newStock.created_at  // Simpan untuk future edit
      });

      // Catat movement
      await supabase.from("stock_movements").insert({
        warehouse_id: formData.warehouseId,
        stock_id: newStock.id,
        product_id: formData.productId,
        bb_produk: formData.bbProduk,
        movement_type: "npl",
        reference_type: "npl_history",
        reference_id: nplEntry.id,
        qty_before: 0,
        qty_change: loc.qtyCarton,
        qty_after: loc.qtyCarton,
        to_location: `${loc.cluster}-L${loc.lorong}-B${loc.baris}-P${loc.level}`,
        performed_by: user.id,
        notes: "Nota Pengembalian Lapangan",
      });
    }

    // Update npl_history dengan stock_id untuk tracking akurat
    await supabase
      .from("npl_history")
      .update({ locations: updatedLocations })
      .eq("id", nplEntry.id);

    revalidatePath("/stock-list");
    revalidatePath("/warehouse-layout");
    revalidatePath("/npl");

    return { success: true, transactionCode };
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}

// Edit NPL Action (Soft Delete - Hapus stok lama, populate form)
export async function getNplDataForEditAction(nplHistoryId: string) {
  const supabase = await createClient();

  const { data: nplData, error } = await supabase
    .from("npl_history")
    .select("*")
    .eq("id", nplHistoryId)
    .single();

  if (error || !nplData) {
    return { success: false, message: "Data NPL tidak ditemukan" };
  }

  return { success: true, data: nplData };
}

// Cancel/Batal Transaksi NPL (Hard Delete - hapus permanent)
export async function cancelNplAction(nplHistoryId: string) {
  const supabase = await createClient();

  try {
    // 1. Ambil User untuk log
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    // 2. Ambil data npl_history untuk mendapatkan lokasi dan qty
    const { data: nplData, error: errFetch } = await supabase
      .from("npl_history")
      .select("*")
      .eq("id", nplHistoryId)
      .single();

    if (errFetch || !nplData) {
      return { success: false, message: "Data NPL tidak ditemukan" };
    }

    // 3. Loop melalui setiap lokasi dan hapus stock_list
    for (const loc of nplData.locations) {
      const { cluster, lorong, baris, level, qtyCarton, stock_id } = loc;

      let stockItem;

      // PERBAIKAN: Prioritaskan stock_id jika tersedia (tracking akurat)
      if (stock_id) {
        const { data: stockById, error: errById } = await supabase
          .from("stock_list")
          .select("*")
          .eq("id", stock_id)
          .single();
        
        if (!errById && stockById) {
          stockItem = stockById;
        }
      }

      // Fallback: Cari berdasarkan koordinat lokasi (tanpa bb_produk untuk menghindari masalah edit)
      if (!stockItem) {
        const { data: stockItems, error: errStock } = await supabase
          .from("stock_list")
          .select("*")
          .eq("warehouse_id", nplData.warehouse_id)
          .eq("product_id", nplData.product_id)
          .eq("cluster", cluster)
          .eq("lorong", lorong)
          .eq("baris", baris)
          .eq("level", level)
          .order("created_at", { ascending: false });

        if (errStock || !stockItems || stockItems.length === 0)
          throw new Error(`Stock tidak ditemukan di lokasi ${cluster}-L${lorong}-B${baris}-P${level}`);

        stockItem = stockItems[0];
      }

      // Log stock movement untuk pembatalan
      await supabase.from("stock_movements").insert({
        warehouse_id: nplData.warehouse_id,
        stock_id: stockItem.id,
        product_id: nplData.product_id,
        bb_produk: nplData.bb_produk,
        movement_type: "cancel_npl",
        reference_type: "npl_history",
        reference_id: nplHistoryId,
        qty_before: stockItem.qty_carton,
        qty_change: -qtyCarton,
        qty_after: 0,
        from_location: `${cluster}-L${lorong}-B${baris}-P${level}`,
        performed_by: user.id,
        notes: `Pembatalan transaksi NPL ${nplData.transaction_code}`,
      });

      // Hapus stock_list - TRIGGER FEFO akan otomatis recalculate
      await supabase
        .from("stock_list")
        .delete()
        .eq("id", stockItem.id);
    }

    // 4. Hapus record npl_history (Hard delete)
    const { error: errDelete } = await supabase
      .from("npl_history")
      .delete()
      .eq("id", nplHistoryId);

    if (errDelete) {
      return { success: false, message: errDelete.message };
    }

    // 5. Log activity
    await supabase.from("activity_logs").insert({
      user_id: user.id,
      action_type: "cancel_npl",
      table_name: "npl_history",
      record_id: nplHistoryId,
      description: `Membatalkan transaksi NPL ${nplData.transaction_code}`,
      metadata: { transaction_code: nplData.transaction_code },
    });

    // Revalidate untuk refresh data
    revalidatePath("/npl");
    revalidatePath("/stock-list");
    revalidatePath("/warehouse-layout");

    return { success: true, message: "Transaksi NPL berhasil dibatalkan. Trigger FEFO otomatis memperbarui antrian." };
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}
