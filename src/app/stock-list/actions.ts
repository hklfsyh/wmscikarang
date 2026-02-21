"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export async function deleteStockItems(stockIds: string[]) {
  try {
    const supabase = await createClient();
    
    // Verifikasi user login
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "User tidak terautentikasi" };
    }

    // Ambil profil user untuk verifikasi role
    const { data: profile } = await supabase
      .from("users")
      .select("role, warehouse_id")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return { success: false, error: "Profil user tidak ditemukan" };
    }

    // Hanya admin cabang yang bisa menghapus stock
    if (profile.role !== "admin_cabang") {
      return { success: false, error: "Hanya admin cabang yang dapat menghapus data stock" };
    }

    // Hapus data stock dari database
    const { error: deleteError } = await supabase
      .from("stock_list")
      .delete()
      .in("id", stockIds)
      .eq("warehouse_id", profile.warehouse_id); // Pastikan hanya menghapus stock dari warehouse sendiri

    if (deleteError) {
      console.error("Error deleting stock items:", deleteError);
      return { success: false, error: "Gagal menghapus data stock" };
    }

    // Revalidate halaman stock list dan warehouse layout
    revalidatePath("/stock-list");
    revalidatePath("/warehouse-layout");

    return { success: true, deletedCount: stockIds.length };
  } catch (error) {
    console.error("Unexpected error in deleteStockItems:", error);
    return { success: false, error: "Terjadi kesalahan tidak terduga" };
  }
}
