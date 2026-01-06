"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export async function submitStockOpname(auditorName: string, auditItems: any[]) {
  const supabase = await createClient();

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Sesi berakhir.");

    // 1. Ambil Profile untuk dapat warehouse_id
    const { data: profile } = await supabase
      .from("users")
      .select("warehouse_id")
      .eq("id", user.id)
      .single();

    if (!profile?.warehouse_id) throw new Error("Warehouse tidak ditemukan.");

    // 2. Generate Opname Code
    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const { count } = await supabase
      .from("prestock_opname")
      .select("*", { count: "exact", head: true })
      .gte("created_at", new Date().toISOString().slice(0, 10));
    
    const opnameCode = `OPN-${todayStr}-${String((count || 0) + 1).padStart(4, "0")}`;

    // 3. Simpan Header (prestock_opname)
    const { data: header, error: headError } = await supabase
      .from("prestock_opname")
      .insert({
        warehouse_id: profile.warehouse_id,
        opname_code: opnameCode,
        auditor_id: user.id, // ID User yang login
        audit_date: new Date().toISOString().slice(0, 10),
        audit_time: new Date().toLocaleTimeString("en-GB"),
        reconciliation_status: "pending",
        reconciliation_notes: auditorName // Kita simpan nama auditor input manual di sini sementara
      })
      .select()
      .single();

    if (headError) throw headError;

    // 4. Ambil Snapshot System Qty saat ini dari stock_list
    // Kita hitung total karton per produk di gudang tersebut
    const { data: currentStocks } = await supabase
      .from("stock_list")
      .select("product_id, qty_carton")
      .eq("warehouse_id", profile.warehouse_id);

    // Grouping stok untuk perbandingan cepat
    const systemQtyMap = (currentStocks || []).reduce((acc: any, curr) => {
      acc[curr.product_id] = (acc[curr.product_id] || 0) + curr.qty_carton;
      return acc;
    }, {});

    // 5. Simpan Items (prestock_opname_items)
    const itemsToInsert = auditItems.map((item) => {
      const sysQty = systemQtyMap[item.productId] || 0;
      return {
        opname_id: header.id,
        product_id: item.productId,
        audit_qty: item.auditQty,
        system_qty: sysQty,
        difference: item.auditQty - sysQty,
        is_reconciled: false
      };
    });

    const { error: itemError } = await supabase
      .from("prestock_opname_items")
      .insert(itemsToInsert);

    if (itemError) throw itemError;

    revalidatePath("/prestock-opname-history");
    return { success: true, opnameCode };

  } catch (err: any) {
    console.error("Audit Error:", err);
    return { success: false, message: err.message };
  }
}

export async function reconcileStockOpname(opnameId: string, notes: { productId: string, reason: string }[]) {
  const supabase = await createClient();

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Sesi berakhir.");

    // 1. Update Header Audit
    const { error: headError } = await supabase
      .from("prestock_opname")
      .update({
        reconciliation_status: "reconciled",
        reconciled_by: user.id,
        reconciled_at: new Date().toISOString(),
      })
      .eq("id", opnameId);

    if (headError) throw headError;

    // 2. Update Alasan per Item yang memiliki selisih
    for (const note of notes) {
      const { error: itemError } = await supabase
        .from("prestock_opname_items")
        .update({
          is_reconciled: true,
          reconciliation_reason: note.reason
        })
        .eq("opname_id", opnameId)
        .eq("product_id", note.productId);

      if (itemError) throw itemError;
    }

    revalidatePath("/prestock-opname-history");
    return { success: true };
  } catch (err: any) {
    console.error("Reconcile Error:", err);
    return { success: false, message: err.message };
  }
}
