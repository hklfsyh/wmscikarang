import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import WarehouseManagementClient from "./WarehouseManagementClient";

export default async function WarehouseManagementPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Ambil profil user untuk proteksi role dengan RPC + fallback
  const { data: profiles, error: rpcError } = await supabase
    .rpc("get_current_user_profile");
  
  let profile = null;
  if (rpcError || !profiles || profiles.length === 0) {
    // Fallback ke direct query jika RPC gagal
    const { data: fallbackProfile } = await supabase
      .from("users")
      .select("role, warehouse_id, full_name, username")
      .eq("id", user.id)
      .single();
    profile = fallbackProfile;
  } else {
    profile = profiles[0];
  }

  if (!profile || profile.role !== "developer") {
    redirect("/warehouse-layout");
  }

  // AMBIL DATA REAL DARI DATABASE
  const { data: warehousesData } = await supabase
    .from("warehouses")
    .select("*")
    .order("created_at", { ascending: false });

  // Transformasi data database (snake_case) ke camelCase untuk aplikasi Anda
  const formattedWarehouses = (warehousesData || []).map((wh: any) => ({
    id: wh.id,
    warehouseCode: wh.warehouse_code,
    cityName: wh.city_name,
    address: wh.address,
    phone: wh.phone,
    isActive: wh.is_active,
    createdAt: wh.created_at,
    updatedAt: wh.updated_at,
  }));

  return (
    <WarehouseManagementClient 
      userProfile={profile} 
      initialWarehouses={formattedWarehouses} 
    />
  );
}