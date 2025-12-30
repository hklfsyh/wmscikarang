import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import InboundClientDispatcher from "./InboundClientDispatcher";

export default async function InboundPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("*, warehouses(city_name, warehouse_code)")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");

  // 1. Ambil data pendukung dasar
  const { data: expeditions } = await supabase
    .from("expeditions")
    .select("*")
    .eq("warehouse_id", profile.warehouse_id);

  const { data: products } = await supabase
    .from("products")
    .select("*")
    .eq("warehouse_id", profile.warehouse_id);

  const { data: currentStock } = await supabase
    .from("stock_list")
    .select("cluster, lorong, baris, level")
    .eq("warehouse_id", profile.warehouse_id);

  const { data: productHomes } = await supabase
    .from("product_homes")
    .select("*")
    .eq("warehouse_id", profile.warehouse_id);

  const { data: clusterConfigs } = await supabase
    .from("cluster_configs")
    .select("*")
    .eq("warehouse_id", profile.warehouse_id);

  // Ambil data users untuk mapping received_by
  const { data: users } = await supabase
    .from("users")
    .select("id, full_name, username")
    .eq("warehouse_id", profile.warehouse_id);

  // 2. Ambil Riwayat Inbound (History)
  let historyQuery = supabase
    .from("inbound_history")
    .select("*")
    .eq("warehouse_id", profile.warehouse_id)
    .order("arrival_time", { ascending: false });

  // Jika warehouse_admin, batasi hanya hari ini untuk performa
  if (profile.role === "admin_warehouse") {
    const today = new Date().toISOString().split('T')[0];
    historyQuery = historyQuery.gte("arrival_time", today);
  }

  const { data: historyData } = await historyQuery;

  // Mapping data history agar camelCase sesuai interface UI lama Anda
  const formattedHistory = (historyData || []).map((item: any) => ({
    id: item.id,
    transactionCode: item.transaction_code,
    productId: item.product_id,
    arrivalTime: item.arrival_time,
    expeditionId: item.expedition_id,
    driverName: item.driver_name,
    vehicleNumber: item.vehicle_number,
    dnNumber: item.dn_number,
    bbProduk: item.bb_produk,
    expiredDate: item.expired_date,
    qtyCarton: item.qty_carton,
    receivedBy: item.received_by,
    notes: item.notes,
    locations: item.locations // JSONB sudah otomatis jadi array of objects
  }));

  return (
    <InboundClientDispatcher 
      profile={profile}
      expeditions={expeditions || []}
      products={products || []}
      currentStock={currentStock || []}
      productHomes={productHomes || []}
      warehouseId={profile.warehouse_id}
      clusterConfigs={clusterConfigs || []}
      historyData={formattedHistory}
      users={users || []}
    />
  );
}