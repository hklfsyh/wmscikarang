// src/app/outbound/page.tsx

import { createClient } from "@/utils/supabase/server";
import { OutboundForm } from "@/components/outbound-form";
import { OutboundHistoryPage } from "@/components/outbound-history";
import { redirect } from "next/navigation";

export default async function OutboundPage() {
  const supabase = await createClient();

  // 1. Cek Sesi User
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // 2. Ambil Profil & Role User
  const { data: profile } = await supabase
    .from("users")
    .select("role, warehouse_id")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");

  // 3. Ambil Data Produk Real (Hanya untuk gudang user tersebut)
  const { data: products } = await supabase
    .from("products")
    .select("*")
    .eq("warehouse_id", profile.warehouse_id)
    .order("product_name", { ascending: true });

  // 3. LOGIKA BARU: Jika Admin Cabang, ambil SEMUA riwayat riil
  if (profile.role === "admin_cabang") {
    const { data: realHistory } = await supabase
      .from("outbound_history")
      .select("*")
      .eq("warehouse_id", profile.warehouse_id)
      .order("created_at", { ascending: false });

    // Map database fields (snake_case) to component interface (camelCase)
    const formattedHistory = (realHistory || []).map((item: any) => ({
      id: item.id,
      warehouse_id: item.warehouse_id,
      transaction_code: item.transaction_code,
      product_id: item.product_id,
      bb_produk: item.bb_produk,
      qty_carton: item.qty_carton,
      locations: item.locations,
      expedition_id: item.expedition_id,
      driver_name: item.driver_name,
      vehicle_number: item.vehicle_number,
      processed_by: item.processed_by,
      departure_time: item.departure_time,
      notes: item.notes,
      created_at: item.created_at,
    }));

    return (
      <OutboundHistoryPage
        history={formattedHistory}
        products={products || []}
      />
    );
  }

  // 4. Jika Admin Warehouse (Tetap seperti sebelumnya)
  const todayStart = new Date().toISOString().slice(0, 10);
  const { data: historyToday } = await supabase
    .from("outbound_history")
    .select("*")
    .eq("warehouse_id", profile.warehouse_id)
    .gte("created_at", todayStart)
    .order("created_at", { ascending: false });

  // Map for consistency
  const formattedTodayHistory = (historyToday || []).map((item: any) => ({
    id: item.id,
    warehouse_id: item.warehouse_id,
    transaction_code: item.transaction_code,
    product_id: item.product_id,
    bb_produk: item.bb_produk,
    qty_carton: item.qty_carton,
    locations: item.locations,
    expedition_id: item.expedition_id,
    driver_name: item.driver_name,
    vehicle_number: item.vehicle_number,
    processed_by: item.processed_by,
    departure_time: item.departure_time,
    notes: item.notes,
    created_at: item.created_at,
  }));

  return (
    <OutboundForm
      products={products || []}
      warehouseId={profile.warehouse_id || ""}
      history={formattedTodayHistory}
    />
  );
}
