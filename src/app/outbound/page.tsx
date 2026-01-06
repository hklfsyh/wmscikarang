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

    return (
      <OutboundHistoryPage
        history={realHistory || []}
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

  return (
    <OutboundForm
      products={products || []}
      warehouseId={profile.warehouse_id || ""}
      history={historyToday || []}
    />
  );
}
