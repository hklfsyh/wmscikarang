// src/app/warehouse-layout/page.tsx

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import WarehouseLayoutClient from "./WarehouseLayoutClient";

export default async function WarehouseLayoutPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // 1. Ambil Profil User
  const { data: profile } = await supabase
    .from("users")
    .select("role, warehouse_id")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");

  // 2. Ambil Data Konfigurasi Gudang (Real DB)
  const [stocksRes, configsRes, homesRes] = await Promise.all([
    supabase
      .from("stock_list")
      .select("*, products(id, product_code, product_name, default_cluster)")
      .eq("warehouse_id", profile.warehouse_id),
    supabase
      .from("cluster_configs")
      .select("*")
      .eq("warehouse_id", profile.warehouse_id)
      .eq("is_active", true),
    supabase
      .from("product_homes")
      .select("*")
      .eq("warehouse_id", profile.warehouse_id)
  ]);

  return (
    <div className="min-h-screen bg-slate-50">
      <WarehouseLayoutClient 
        userProfile={profile}
        initialStocks={stocksRes.data || []}
        clusterConfigs={configsRes.data || []}
        productHomes={homesRes.data || []}
      />
    </div>
  );
}