"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { getIndonesianDateTime, getIndonesianDateString } from "@/lib/utils/datetime";

/**
 * Fetch current real-time stock data from database
 * Used by client to get fresh data before location checks
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

export async function moveStockAction(
  warehouseId: string,
  stockId: string,
  targetLoc: { cluster: string; lorong: number; baris: number; level: number },
  reason: string
) {
  const supabase = await createClient();

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Sesi berakhir.");

    // 1. Ambil data stok lama untuk keperluan log
    const { data: oldStock, error: errFetch } = await supabase
      .from("stock_list")
      .select("*")
      .eq("id", stockId)
      .single();

    if (errFetch || !oldStock) throw new Error("Data stok tidak ditemukan.");

    // 2. Generate Transaction Code Permutasi
    const todayStr = getIndonesianDateString();
    const transactionCode = `PMT-${todayStr}-${Math.random()
      .toString(36)
      .substr(2, 4)
      .toUpperCase()}`;

    // 3. Update stock_list (Pindah lokasi - PRESERVE created_at!)
    const { error: errUpdate } = await supabase
      .from("stock_list")
      .update({
        cluster: targetLoc.cluster,
        lorong: targetLoc.lorong,
        baris: targetLoc.baris,
        level: targetLoc.level,
        updated_at: getIndonesianDateTime(),
        // CRITICAL: Jangan update created_at agar urutan FEFO tetap konsisten!
      })
      .eq("id", stockId);

    if (errUpdate) throw errUpdate;

    // 4. Catat ke permutasi_history dan dapatkan ID untuk reference
    const { data: historyEntry, error: errHistory } = await supabase
      .from("permutasi_history")
      .insert({
        warehouse_id: warehouseId,
        transaction_code: transactionCode,
        stock_id: stockId,
        product_id: oldStock.product_id,
        qty_carton: oldStock.qty_carton,
        from_cluster: oldStock.cluster,
        from_lorong: oldStock.lorong,
        from_baris: oldStock.baris,
        from_level: oldStock.level,
        to_cluster: targetLoc.cluster,
        to_lorong: targetLoc.lorong,
        to_baris: targetLoc.baris,
        to_level: targetLoc.level,
        reason: reason,
        moved_by: user.id,
        moved_at: getIndonesianDateTime(),
      })
      .select()
      .single();

    if (errHistory || !historyEntry) throw errHistory || new Error("Gagal menyimpan history");

    // 5. Catat ke stock_movements (Log pergerakan global dengan reference_id UUID)
    await supabase.from("stock_movements").insert({
      warehouse_id: warehouseId,
      stock_id: stockId,
      product_id: oldStock.product_id,
      movement_type: "permutasi",
      reference_type: "permutasi_history",
      reference_id: historyEntry.id, // UUID dari permutasi_history, bukan transactionCode
      qty_before: oldStock.qty_carton,
      qty_change: 0, // Permutasi tidak mengubah jumlah barang
      qty_after: oldStock.qty_carton,
      from_location: `${oldStock.cluster}-L${oldStock.lorong}-B${oldStock.baris}-P${oldStock.level}`,
      to_location: `${targetLoc.cluster}-L${targetLoc.lorong}-B${targetLoc.baris}-P${targetLoc.level}`,
      performed_by: user.id,
      notes: reason,
    });

    revalidatePath("/stock-list");
    revalidatePath("/warehouse-layout");
    revalidatePath("/permutasi");

    return { success: true };
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}
