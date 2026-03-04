"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

// Search stock berdasarkan BB atau Product Code/Name
export async function searchStock(searchQuery: string) {
  try {
    const supabase = await createClient();

    // Verifikasi user login
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "User tidak terautentikasi" };
    }

    // Ambil profil user untuk warehouse_id
    const { data: profile } = await supabase
      .from("users")
      .select("role, warehouse_id")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return { success: false, error: "Profil user tidak ditemukan" };
    }

    // Hanya admin cabang atau developer yang bisa search
    if (profile.role !== "admin_cabang" && profile.role !== "developer") {
      return {
        success: false,
        error: "Hanya admin cabang yang dapat mengakses fitur ini",
      };
    }

    const query = searchQuery.trim().toUpperCase();

    if (!query) {
      return { success: false, error: "Query pencarian tidak boleh kosong" };
    }

    // Query dengan join products untuk search by product code/name atau bb_produk
    const { data: stockData, error: stockError } = await supabase
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
      .or(
        `bb_produk.ilike.%${query}%,products.product_code.ilike.%${query}%,products.product_name.ilike.%${query}%`
      )
      .order("inbound_date", { ascending: false })
      .limit(100);

    if (stockError) {
      console.error("Error searching stock:", stockError);
      return { success: false, error: "Gagal mencari data stock" };
    }

    // Transform data untuk client
    const transformedData = stockData.map((item: any) => ({
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

    return { success: true, data: transformedData };
  } catch (error) {
    console.error("Unexpected error in searchStock:", error);
    return { success: false, error: "Terjadi kesalahan tidak terduga" };
  }
}

// Hold stock by product (all BB and locations)
export async function holdStockByProduct(
  productId: string,
  holdReason: string,
  holdNote?: string
) {
  try {
    const supabase = await createClient();

    // Verifikasi user login
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "User tidak terautentikasi" };
    }

    // Ambil profil user
    const { data: profile } = await supabase
      .from("users")
      .select("role, warehouse_id")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return { success: false, error: "Profil user tidak ditemukan" };
    }

    // Hanya admin cabang atau developer yang bisa hold
    if (profile.role !== "admin_cabang" && profile.role !== "developer") {
      return {
        success: false,
        error: "Hanya admin cabang yang dapat hold stock",
      };
    }

    if (!holdReason || holdReason.trim() === "") {
      return { success: false, error: "Alasan hold harus diisi" };
    }

    // Update all stocks with this product_id and warehouse_id that are not already held
    const { data: updatedStocks, error: updateError } = await supabase
      .from("stock_list")
      .update({
        is_hold: true,
        hold_reason: holdReason.trim(),
        hold_by: user.id,
        hold_at: new Date().toISOString(),
        hold_note: holdNote?.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq("product_id", productId)
      .eq("warehouse_id", profile.warehouse_id)
      .eq("is_hold", false)
      .select("id");

    if (updateError) {
      console.error("Error holding stocks by product:", updateError);
      return { success: false, error: "Gagal hold stock" };
    }

    const count = updatedStocks?.length || 0;

    // Revalidate paths
    revalidatePath("/stock-hold");
    revalidatePath("/stock-list");
    revalidatePath("/warehouse-layout");

    return {
      success: true,
      message: `Berhasil hold ${count} stock dari produk ini`,
      count,
    };
  } catch (error) {
    console.error("Unexpected error in holdStockByProduct:", error);
    return { success: false, error: "Terjadi kesalahan tidak terduga" };
  }
}

// Hold stock by product + BB (specific batch)
export async function holdStockByProductAndBB(
  productId: string,
  bbProduk: string,
  holdReason: string,
  holdNote?: string
) {
  try {
    const supabase = await createClient();

    // Verifikasi user login
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "User tidak terautentikasi" };
    }

    // Ambil profil user
    const { data: profile } = await supabase
      .from("users")
      .select("role, warehouse_id")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return { success: false, error: "Profil user tidak ditemukan" };
    }

    // Hanya admin cabang atau developer yang bisa hold
    if (profile.role !== "admin_cabang" && profile.role !== "developer") {
      return {
        success: false,
        error: "Hanya admin cabang yang dapat hold stock",
      };
    }

    if (!holdReason || holdReason.trim() === "") {
      return { success: false, error: "Alasan hold harus diisi" };
    }

    // Update all stocks with this product_id, bb_produk, and warehouse_id that are not already held
    const { data: updatedStocks, error: updateError } = await supabase
      .from("stock_list")
      .update({
        is_hold: true,
        hold_reason: holdReason.trim(),
        hold_by: user.id,
        hold_at: new Date().toISOString(),
        hold_note: holdNote?.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq("product_id", productId)
      .eq("bb_produk", bbProduk)
      .eq("warehouse_id", profile.warehouse_id)
      .eq("is_hold", false)
      .select("id");

    if (updateError) {
      console.error("Error holding stocks by product and BB:", updateError);
      return { success: false, error: "Gagal hold stock" };
    }

    const count = updatedStocks?.length || 0;

    // Revalidate paths
    revalidatePath("/stock-hold");
    revalidatePath("/stock-list");
    revalidatePath("/warehouse-layout");

    return {
      success: true,
      message: `Berhasil hold ${count} stock dengan BB ${bbProduk}`,
      count,
    };
  } catch (error) {
    console.error("Unexpected error in holdStockByProductAndBB:", error);
    return { success: false, error: "Terjadi kesalahan tidak terduga" };
  }
}

// Hold single stock (legacy, kept for backward compatibility)
export async function holdStock(
  stockId: string,
  holdReason: string,
  holdNote?: string
) {
  try {
    const supabase = await createClient();

    // Verifikasi user login
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "User tidak terautentikasi" };
    }

    // Ambil profil user
    const { data: profile } = await supabase
      .from("users")
      .select("role, warehouse_id")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return { success: false, error: "Profil user tidak ditemukan" };
    }

    // Hanya admin cabang atau developer yang bisa hold
    if (profile.role !== "admin_cabang" && profile.role !== "developer") {
      return {
        success: false,
        error: "Hanya admin cabang yang dapat hold stock",
      };
    }

    if (!holdReason || holdReason.trim() === "") {
      return { success: false, error: "Alasan hold harus diisi" };
    }

    // Cek apakah stock ada dan di warehouse yang sama
    const { data: existingStock, error: checkError } = await supabase
      .from("stock_list")
      .select("id, warehouse_id, is_hold")
      .eq("id", stockId)
      .single();

    if (checkError || !existingStock) {
      return { success: false, error: "Stock tidak ditemukan" };
    }

    // Validasi warehouse (kecuali developer)
    if (
      profile.role !== "developer" &&
      existingStock.warehouse_id !== profile.warehouse_id
    ) {
      return {
        success: false,
        error: "Stock tidak berada di warehouse Anda",
      };
    }

    // Cek apakah sudah di-hold
    if (existingStock.is_hold) {
      return { success: false, error: "Stock sudah dalam status hold" };
    }

    // Update stock to hold
    const { error: updateError } = await supabase
      .from("stock_list")
      .update({
        is_hold: true,
        hold_reason: holdReason.trim(),
        hold_by: user.id,
        hold_at: new Date().toISOString(),
        hold_note: holdNote?.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", stockId);

    if (updateError) {
      console.error("Error holding stock:", updateError);
      return { success: false, error: "Gagal hold stock" };
    }

    // Revalidate paths
    revalidatePath("/stock-hold");
    revalidatePath("/stock-list");
    revalidatePath("/warehouse-layout");

    return { success: true, message: "Stock berhasil di-hold" };
  } catch (error) {
    console.error("Unexpected error in holdStock:", error);
    return { success: false, error: "Terjadi kesalahan tidak terduga" };
  }
}

// Unhold stock
export async function unholdStock(stockId: string) {
  try {
    const supabase = await createClient();

    // Verifikasi user login
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "User tidak terautentikasi" };
    }

    // Ambil profil user
    const { data: profile } = await supabase
      .from("users")
      .select("role, warehouse_id")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return { success: false, error: "Profil user tidak ditemukan" };
    }

    // Hanya admin cabang atau developer yang bisa unhold
    if (profile.role !== "admin_cabang" && profile.role !== "developer") {
      return {
        success: false,
        error: "Hanya admin cabang yang dapat unhold stock",
      };
    }

    // Cek apakah stock ada dan di warehouse yang sama
    const { data: existingStock, error: checkError } = await supabase
      .from("stock_list")
      .select("id, warehouse_id, is_hold")
      .eq("id", stockId)
      .single();

    if (checkError || !existingStock) {
      return { success: false, error: "Stock tidak ditemukan" };
    }

    // Validasi warehouse (kecuali developer)
    if (
      profile.role !== "developer" &&
      existingStock.warehouse_id !== profile.warehouse_id
    ) {
      return {
        success: false,
        error: "Stock tidak berada di warehouse Anda",
      };
    }

    // Cek apakah tidak dalam status hold
    if (!existingStock.is_hold) {
      return { success: false, error: "Stock tidak dalam status hold" };
    }

    // Update stock to unhold (clear all hold fields)
    const { error: updateError } = await supabase
      .from("stock_list")
      .update({
        is_hold: false,
        hold_reason: null,
        hold_by: null,
        hold_at: null,
        hold_note: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", stockId);

    if (updateError) {
      console.error("Error unholding stock:", updateError);
      return { success: false, error: "Gagal unhold stock" };
    }

    // Revalidate paths
    revalidatePath("/stock-hold");
    revalidatePath("/stock-list");
    revalidatePath("/warehouse-layout");

    return { success: true, message: "Stock berhasil di-unhold" };
  } catch (error) {
    console.error("Unexpected error in unholdStock:", error);
    return { success: false, error: "Terjadi kesalahan tidak terduga" };
  }
}

// Get all held stocks
export async function getHeldStocks() {
  try {
    const supabase = await createClient();

    // Verifikasi user login
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "User tidak terautentikasi" };
    }

    // Ambil profil user
    const { data: profile } = await supabase
      .from("users")
      .select("role, warehouse_id")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return { success: false, error: "Profil user tidak ditemukan" };
    }

    // Hanya admin cabang atau developer yang bisa lihat held stocks
    if (profile.role !== "admin_cabang" && profile.role !== "developer") {
      return {
        success: false,
        error: "Hanya admin cabang yang dapat mengakses fitur ini",
      };
    }

    // Query held stocks
    const { data: stockData, error: stockError } = await supabase
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
      .eq("is_hold", true)
      .order("hold_at", { ascending: false });

    if (stockError) {
      console.error("Error getting held stocks:", stockError);
      return { success: false, error: "Gagal mengambil data held stocks" };
    }

    // Transform data untuk client
    const transformedData = stockData.map((item: any) => ({
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

    return { success: true, data: transformedData };
  } catch (error) {
    console.error("Unexpected error in getHeldStocks:", error);
    return { success: false, error: "Terjadi kesalahan tidak terduga" };
  }
}
