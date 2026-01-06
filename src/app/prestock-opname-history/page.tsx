// src/app/prestock-opname-history/page.tsx (Server Component)

import { createClient } from "@/utils/supabase/server";
import { Navigation } from "@/components/navigation";
import PrestockOpnameHistoryClient from "./PrestockOpnameHistoryClient";
import { redirect } from "next/navigation";

export default async function PrestockHistoryPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("role, warehouse_id, full_name, username")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");

  // Hanya Admin Cabang yang bisa akses halaman ini
  if (profile.role !== "admin_cabang" && profile.role !== "developer") {
    redirect("/stock-list");
  }

  // Fetch history dengan join ke items dan products
  const { data: history } = await supabase
    .from("prestock_opname")
    .select(`
      *,
      auditor:auditor_id(full_name, username),
      reconciler:reconciled_by(full_name, username),
      prestock_opname_items (
        *,
        products (id, product_code, product_name)
      )
    `)
    .eq("warehouse_id", profile.warehouse_id)
    .order("created_at", { ascending: false });

  return (
    <>
      <Navigation userProfile={profile} />
      <div className="min-h-screen bg-slate-50 lg:pl-8">
        <div className="p-4 sm:p-8">
          <PrestockOpnameHistoryClient 
            initialHistory={history || []} 
            userProfile={profile}
          />
        </div>
      </div>
    </>
  );
}
