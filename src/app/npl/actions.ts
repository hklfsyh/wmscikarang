"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { getIndonesianDateTime, getIndonesianDateString, getIndonesianDate } from "@/lib/utils/datetime";

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

    // 2. Simpan ke npl_history
    const { data: nplEntry, error: errNpl } = await supabase
      .from("npl_history")
      .insert({
        warehouse_id: formData.warehouseId,
        transaction_code: transactionCode,
        product_id: formData.productId,
        bb_produk: formData.bbProduk,
        qty_carton: formData.totalQty,
        expired_date: formData.expiredDate,
        locations: placements, // Data array lokasi penempatan
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
    for (const loc of placements) {
      // Tentukan status berdasarkan aturan yang Anda minta
      let finalStatus = formData.baseStatus; // hold atau release
      if (loc.isReceh) finalStatus = "receh";

      const { data: newStock, error: errStock } = await supabase
        .from("stock_list")
        .insert({
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
          status: finalStatus,
          is_receh: loc.isReceh,
          created_by: user.id,
        })
        .select()
        .single();

      if (errStock) throw errStock;

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

    revalidatePath("/stock-list");
    revalidatePath("/warehouse-layout");
    revalidatePath("/npl");

    return { success: true, transactionCode };
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}
