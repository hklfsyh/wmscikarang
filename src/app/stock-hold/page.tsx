import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import StockHoldClient from "./StockHoldClient";

export default async function StockHoldPage() {
  const supabase = await createClient();

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Get user profile
  const { data: profile } = await supabase
    .from("users")
    .select("username, role, full_name, warehouse_id")
    .eq("id", user.id)
    .single();

  if (!profile) {
    redirect("/login");
  }

  // Only admin_cabang can access this page
  if (profile.role !== "admin_cabang" && profile.role !== "developer") {
    redirect("/warehouse-layout");
  }

  // Get warehouse info
  const { data: warehouse } = await supabase
    .from("warehouses")
    .select("warehouse_code, city_name")
    .eq("id", profile.warehouse_id)
    .single();

  const warehouseName = warehouse
    ? `${warehouse.warehouse_code} - ${warehouse.city_name}`
    : "Unknown Warehouse";

  // Load all stock data from database (same as stock-list)
  const { data: stockData } = await supabase
    .from("stock_list")
    .select(
      `
      id,
      warehouse_id,
      product_id,
      bb_produk,
      cluster,
      lorong,
      baris,
      level,
      qty_pallet,
      qty_carton,
      expired_date,
      inbound_date,
      status,
      is_receh,
      fefo_status,
      is_hold,
      hold_reason,
      hold_by,
      hold_at,
      hold_note,
      products!inner (
        id,
        product_code,
        product_name
      ),
      hold_by_user:users!stock_list_hold_by_fkey (
        id,
        username,
        full_name
      )
    `
    )
    .eq("warehouse_id", profile.warehouse_id)
    .order("inbound_date", { ascending: false });

  // Transform data untuk client
  const formattedStock = (stockData || []).map((item: any) => ({
    id: item.id,
    warehouseId: item.warehouse_id,
    productId: item.product_id,
    productCode: item.products.product_code,
    productName: item.products.product_name,
    bbProduk: item.bb_produk,
    cluster: item.cluster,
    lorong: item.lorong,
    baris: item.baris,
    level: item.level,
    qtyPallet: item.qty_pallet,
    qtyCarton: item.qty_carton,
    expiredDate: item.expired_date,
    inboundDate: item.inbound_date,
    status: item.status,
    isReceh: item.is_receh,
    fefoStatus: item.fefo_status,
    isHold: item.is_hold,
    holdReason: item.hold_reason,
    holdBy: item.hold_by,
    holdAt: item.hold_at,
    holdNote: item.hold_note,
    holdByUser: item.hold_by_user
      ? {
          id: item.hold_by_user.id,
          username: item.hold_by_user.username,
          fullName: item.hold_by_user.full_name,
        }
      : null,
  }));

  return (
    <StockHoldClient
      userProfile={profile}
      warehouseName={warehouseName}
      initialStock={formattedStock}
    />
  );
}
