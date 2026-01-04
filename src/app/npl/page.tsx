// src/app/npl/page.tsx

import { createClient } from "@/utils/supabase/server";
import { NplForm } from "@/components/npl-form";
import { Navigation } from "@/components/navigation";
import { redirect } from "next/navigation";

export default async function NplPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // 1. Ambil Profil User Login
  const { data: profile } = await supabase
    .from("users")
    .select("username, role, full_name, warehouse_id")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");

  // 2. Ambil Data Pendukung secara Paralel untuk Performa
  const [productsRes, stocksRes, configsRes, homesRes, historyRes] = await Promise.all([
    // Ambil produk yang tersedia di gudang tersebut
    supabase
      .from("products")
      .select("*")
      .eq("warehouse_id", profile.warehouse_id)
      .order("product_name", { ascending: true }),

    // Ambil stok aktif untuk pengecekan lokasi kosong (Smart Recommendation)
    supabase
      .from("stock_list")
      .select("cluster, lorong, baris, level")
      .eq("warehouse_id", profile.warehouse_id),

    // Ambil konfigurasi cluster (jumlah lorong dsb)
    supabase
      .from("cluster_configs")
      .select("*")
      .eq("warehouse_id", profile.warehouse_id)
      .eq("is_active", true),

    // Ambil aturan product home (untuk validasi lokasi penempatan)
    supabase
      .from("product_homes")
      .select("*")
      .eq("warehouse_id", profile.warehouse_id),

    // Ambil riwayat NPL hari ini
    supabase
      .from("npl_history")
      .select("*, products(product_code, product_name)")
      .eq("warehouse_id", profile.warehouse_id)
      .gte("created_at", new Date().toISOString().slice(0, 10))
      .order("created_at", { ascending: false })
  ]);

  return (
    <>
      <Navigation userProfile={profile} />
      <div className="min-h-screen bg-slate-50">
        <NplForm 
          warehouseId={profile.warehouse_id || ""}
          products={productsRes.data || []}
          initialStocks={stocksRes.data || []}
          clusterConfigs={configsRes.data || []}
          productHomes={homesRes.data || []}
          initialHistory={historyRes.data || []}
        />
      </div>
    </>
  );
}