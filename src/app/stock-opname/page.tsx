// src/app/stock-opname/page.tsx (Server Component)

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import StockOpnameClient from "./StockOpnameClient";

export default async function StockOpnamePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Ambil Profile User dengan fallback
  let profile = null;
  
  const { data: profiles, error: rpcError } = await supabase
    .rpc("get_current_user_profile");
  
  if (rpcError || !profiles || profiles.length === 0) {
    // Fallback ke query biasa
    const { data: fallbackProfile } = await supabase
      .from("users")
      .select("role, warehouse_id")
      .eq("id", user.id)
      .single();
    profile = fallbackProfile;
  } else {
    profile = profiles[0];
  }

  if (!profile || !profile.warehouse_id) redirect("/warehouse-layout");

  // Ambil data produk aktif untuk di-audit (filter by warehouse_id)
  const { data: products } = await supabase
    .from("products")
    .select("id, product_code, product_name")
    .eq("warehouse_id", profile.warehouse_id)
    .eq("is_active", true)
    .order("product_name");

  return <StockOpnameClient products={products || []} />;
}