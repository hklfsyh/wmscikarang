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
    .eq("warehouse_id", profile.warehouse_id)
    .eq("is_active", true);

  // Ambil cluster_cell_overrides untuk custom baris/pallet per lorong
  const { data: clusterOverrides } = await supabase
    .from("cluster_cell_overrides")
    .select("*")
    .eq("is_disabled", false);

  // Ambil data users untuk mapping received_by
  const { data: users } = await supabase
    .from("users")
    .select("id, full_name, username")
    .eq("warehouse_id", profile.warehouse_id);

  // 2. Ambil Riwayat Inbound (History) - Include NPL untuk admin_cabang
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

  // Untuk admin_cabang, INCLUDE NPL history sebagai secondary inbound
  let nplHistoryData: any[] = [];
  if (profile.role === "admin_cabang") {
    const { data: nplData } = await supabase
      .from("npl_history")
      .select("*")
      .eq("warehouse_id", profile.warehouse_id)
      .order("return_time", { ascending: false });
    nplHistoryData = nplData || [];
  }

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
    locations: item.locations, // JSONB sudah otomatis jadi array of objects
    source: "inbound" // Tag untuk membedakan sumber
  }));

  // Map NPL history dengan format yang sama (sebagai secondary inbound)
  const formattedNPLHistory = nplHistoryData.map((item: any) => ({
    id: item.id,
    transactionCode: item.transaction_code,
    productId: item.product_id,
    arrivalTime: item.return_time, // NPL use return_time
    expeditionId: null, // NPL tidak ada expedition
    driverName: item.driver_name,
    vehicleNumber: item.vehicle_number,
    dnNumber: null, // NPL tidak ada DN number
    bbProduk: item.bb_produk,
    expiredDate: item.expired_date,
    qtyCarton: item.qty_carton,
    receivedBy: item.returned_by, // returned_by = received_by
    notes: item.notes || "NPL (Nota Pengembalian Lapangan)",
    locations: item.locations,
    source: "npl" // Tag untuk membedakan sumber
  }));

  // Gabungkan dan sort by time (descending)
  const combinedHistory = [...formattedHistory, ...formattedNPLHistory].sort((a, b) => 
    new Date(b.arrivalTime).getTime() - new Date(a.arrivalTime).getTime()
  );

  return (
    <InboundClientDispatcher 
      profile={profile}
      expeditions={expeditions || []}
      products={products || []}
      currentStock={currentStock || []}
      productHomes={productHomes || []}
      warehouseId={profile.warehouse_id}
      clusterConfigs={clusterConfigs || []}
      clusterOverrides={clusterOverrides || []}
      historyData={combinedHistory}
      users={users || []}
    />
  );
}