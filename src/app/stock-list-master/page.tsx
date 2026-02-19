// src/app/stock-list-master/page.tsx
import { createClient } from "@/utils/supabase/server";
import StockListMasterClient from "./StockListMasterClient";
import { Navigation } from "@/components/navigation";
import { redirect } from "next/navigation";

export default async function StockListMasterPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profiles, error: rpcError } = await supabase.rpc("get_current_user_profile");
  
  let profile = null;
  if (rpcError || !profiles || profiles.length === 0) {
    const { data: fallbackProfile } = await supabase
      .from("users")
      .select("*")
      .eq("id", user.id)
      .single();
    profile = fallbackProfile;
  } else {
    profile = profiles[0];
  }
  if (profile.role !== "admin_cabang") redirect("/stock-list");

  // Fetch semua data master secara paralel
  const [products, expeditions, configs, overrides, homes] = await Promise.all([
    supabase.from("products").select("*").eq("warehouse_id", profile.warehouse_id).order("product_name"),
    supabase.from("expeditions").select("*").eq("warehouse_id", profile.warehouse_id).order("expedition_name"),
    supabase.from("cluster_configs").select("*").eq("warehouse_id", profile.warehouse_id).order("cluster_name"),
    supabase.from("cluster_cell_overrides").select("*").order("cluster_config_id, lorong_start"),
    supabase.from("product_homes").select("*, products(product_code, product_name)").eq("warehouse_id", profile.warehouse_id).order("priority")
  ]);

  return (
    <>
      <Navigation userProfile={profile} />
      <StockListMasterClient 
        warehouseId={profile.warehouse_id}
        initialProducts={products.data || []}
        initialExpeditions={expeditions.data || []}
        initialClusterConfigs={configs.data || []}
        initialCellOverrides={overrides.data || []}
        initialProductHomes={homes.data || []}
      />
    </>
  );
}