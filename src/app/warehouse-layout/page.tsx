// src/app/warehouse-layout/page.tsx

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import WarehouseLayoutClient from "./WarehouseLayoutClient";

export default async function WarehouseLayoutPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // 1. Ambil Profil User
  let profile = null;
  
  const { data: profiles, error: rpcError } = await supabase
    .rpc("get_current_user_profile");
  
  if (rpcError || !profiles || profiles.length === 0) {
    // Fallback ke query biasa
    const { data: fallbackProfile } = await supabase
      .from("users")
      .select("role, warehouse_id, full_name, username")
      .eq("id", user.id)
      .single();
    profile = fallbackProfile;
  } else {
    profile = profiles[0];
  }

  if (!profile) redirect("/login");

  // 2. Ambil Data Konfigurasi Gudang (Real DB)
  const [stocksRes, configsRes, overridesRes, homesRes] = await Promise.all([
    supabase
      .from("stock_list")
      .select("*, products(id, product_code, product_name, default_cluster)")
      .eq("warehouse_id", profile.warehouse_id)
      .order("fefo_status", { ascending: false }) // Release first
      .order("bb_produk", { ascending: true }), // Then by BB Produk
    supabase
      .from("cluster_configs")
      .select("*")
      .eq("warehouse_id", profile.warehouse_id)
      .eq("is_active", true),
    supabase
      .from("cluster_cell_overrides")
      .select("*"),
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
        clusterCellOverrides={overridesRes.data || []}
        productHomes={homesRes.data || []}
      />
    </div>
  );
}