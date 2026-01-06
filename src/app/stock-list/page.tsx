import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import StockListClient from "./StockListClient";

export default async function StockListPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

// 1. Ambil Profil User Login
  const { data: profile } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");

  // 2. Ambil Data Warehouse (Gunakan profile.warehouse_id)
  const { data: warehouseData } = await supabase
    .from("warehouses")
    .select("id, warehouse_code, city_name")
    .eq("id", profile.warehouse_id)
    .single();

  // 3. Ambil Data Stok (Filter ketat berdasarkan warehouse_id)
  const { data: stockData } = await supabase
    .from("stock_list")
    .select(`
      *,
      products (
        id, product_code, product_name,
        qty_per_carton, qty_carton_per_pallet, default_cluster
      )
    `)
    .eq("warehouse_id", profile.warehouse_id) // Filter Database
    .order("fefo_status", { ascending: false }) // Release dulu (R > H)
    .order("bb_produk", { ascending: true }); // Kemudian urutkan berdasarkan BB Produk

  // 4. Ambil Master Produk untuk Filter Dropdown
  const { data: productsMaster } = await supabase
    .from("products")
    .select("id, product_name")
    .eq("warehouse_id", profile.warehouse_id) // Filter agar produk gudang lain tidak muncul
    .order("product_name", { ascending: true });

  // 5. Mapping data (Pastikan penamaan camelCase sesuai Interface Client)
  const formattedStock = (stockData || []).map((item: any) => ({
    id: item.id,
    productId: item.product_id,
    productName: item.products?.product_name || "N/A",
    productCode: item.products?.product_code || "N/A",
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
    fefoStatus: item.fefo_status, // TAMBAHAN: Status FEFO dari trigger database
    isReceh: item.is_receh,
    parentStockId: item.parent_stock_id,
    productInfo: {
      qtyPerCarton: item.products?.qty_per_carton,
      qtyCartonPerPallet: item.products?.qty_carton_per_pallet,
      defaultCluster: item.products?.default_cluster
    }
  }));

  return (
    <StockListClient 
      userProfile={profile}
      warehouse={warehouseData} // Kirim data warehouse ke Client
      initialStock={formattedStock} 
      productsList={productsMaster || []}
    />
  );
}