import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import WarehouseManagementClient from "./WarehouseManagementClient";

export default async function WarehouseManagementPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Ambil profil user untuk proteksi role
  const { data: profile } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "developer") {
    redirect("/");
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