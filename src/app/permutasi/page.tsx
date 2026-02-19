// src/app/permutasi/page.tsx

import { createClient } from "@/utils/supabase/server";
import { PermutasiForm } from "@/components/permutasi-form";
import { Navigation } from "@/components/navigation";
import { redirect } from "next/navigation";

export default async function PermutasiPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // 1. Ambil Profil User
  const { data: profiles, error: rpcError } = await supabase
    .rpc("get_current_user_profile");
  
  let profile = null;
  if (rpcError || !profiles || profiles.length === 0) {
    const { data: fallbackProfile } = await supabase
      .from("users")
      .select("username, role, full_name, warehouse_id")
      .eq("id", user.id)
      .single();
    profile = fallbackProfile;
  } else {
    profile = profiles[0];
  }

  if (!profile) redirect("/warehouse-layout");

  // 2. Ambil Data yang dibutuhkan Form secara Paralel
  const [stocksRes, configsRes, homesRes, overridesRes, historyRes] = await Promise.all([
    supabase
      .from("stock_list")
      .select("*, products(*)")
      .eq("warehouse_id", profile.warehouse_id),
    supabase
      .from("cluster_configs")
      .select("*")
      .eq("warehouse_id", profile.warehouse_id)
      .eq("is_active", true),
    supabase
      .from("product_homes")
      .select("*")
      .eq("warehouse_id", profile.warehouse_id),
    supabase
      .from("cluster_cell_overrides")
      .select("*, cluster_configs!inner(warehouse_id)")
      .eq("cluster_configs.warehouse_id", profile.warehouse_id)
      .eq("is_disabled", false),
    supabase
      .from("permutasi_history")
      .select(`
        *,
        products(product_code, product_name),
        stock_list(fefo_status)
      `)
      .eq("warehouse_id", profile.warehouse_id)
      .order("created_at", { ascending: false })
      .limit(50)
  ]);

  return (
    <>
      <Navigation userProfile={profile} />
      <PermutasiForm 
        warehouseId={profile.warehouse_id || ""}
        initialStocks={stocksRes.data || []}
        clusterConfigs={configsRes.data || []}
        productHomes={homesRes.data || []}
        clusterCellOverrides={overridesRes.data || []}
        initialHistory={historyRes.data || []}
      />
    </>
  );
}