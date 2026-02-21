"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export async function fixStockStatus(warehouseId: string) {
  const supabase = await createClient();

  try {
    // Run SQL to fix all stock status in this warehouse
    const { error } = await supabase.rpc('fix_all_stock_status', {
      p_warehouse_id: warehouseId
    });

    if (error) {
      console.error("Error fixing stock status:", error);
      return { 
        success: false, 
        message: `Error: ${error.message}` 
      };
    }

    // Revalidate page to show updated data
    revalidatePath("/stock-list");

    return { 
      success: true, 
      message: "Status berhasil diperbaiki! Halaman akan di-refresh." 
    };

  } catch (error: any) {
    console.error("Error in fixStockStatus:", error);
    return { 
      success: false, 
      message: `Error: ${error.message}` 
    };
  }
}
