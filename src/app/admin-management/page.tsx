import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import AdminManagementClient from "./AdminManagementClient";

export default async function AdminManagementPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Ambil profil user login
  const { data: profile } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile || (profile.role !== "developer" && profile.role !== "admin_cabang")) {
    redirect("/");
  }

  // AMBIL DATA SEMUA USER DARI DATABASE
  let query = supabase.from("users").select("*, warehouses(city_name)");

  if (profile.role === "admin_cabang") {
    // Filter: Jangan tampilkan developer, dan hanya tampilkan yang satu gudang
    query = query
      .neq("role", "developer")
      .eq("warehouse_id", profile.warehouse_id);
  }

  const { data: usersData } = await query.order("created_at", { ascending: false });

  // Format data ke camelCase agar kompatibel dengan kode UI Anda
  const formattedUsers = (usersData || []).map((u: any) => ({
    id: u.id,
    username: u.username,
    fullName: u.full_name,
    email: u.email,
    phone: u.phone,
    role: u.role,
    isActive: u.is_active,
    warehouseId: u.warehouse_id,
    warehouseName: u.warehouses?.city_name || "Semua Gudang",
    createdAt: u.created_at,
    updatedAt: u.updated_at,
  }));

  return <AdminManagementClient userProfile={profile} initialUsers={formattedUsers} />;
}