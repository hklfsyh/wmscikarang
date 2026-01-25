"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

// --- PRODUCT ACTIONS ---
export async function createProduct(data: {
  warehouse_id: string;
  product_code: string;
  product_name: string;
  qty_per_carton: number;
  qty_carton_per_pallet: number;
  default_cluster: string | null;
  is_active: boolean;
}) {
  const supabase = await createClient();
  const { data: newProduct, error } = await supabase
    .from("products")
    .insert({
      warehouse_id: data.warehouse_id,
      product_code: data.product_code,
      product_name: data.product_name,
      qty_per_carton: data.qty_per_carton,
      qty_carton_per_pallet: data.qty_carton_per_pallet,
      default_cluster: data.default_cluster,
      is_active: data.is_active,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  revalidatePath("/stock-list-master");
  revalidatePath("/inbound");
  revalidatePath("/npl");
  return newProduct;
}

export async function updateProduct(
  id: string,
  data: {
    product_code: string;
    product_name: string;
    qty_per_carton?: number;
    qty_carton_per_pallet?: number;
    default_cluster?: string | null;
    is_active?: boolean;
  }
) {
  const supabase = await createClient();
  const { data: updatedProduct, error } = await supabase
    .from("products")
    .update({
      product_name: data.product_name,
      qty_per_carton: data.qty_per_carton,
      qty_carton_per_pallet: data.qty_carton_per_pallet,
      default_cluster: data.default_cluster,
      is_active: data.is_active,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  revalidatePath("/stock-list-master");
  revalidatePath("/inbound");
  revalidatePath("/npl");
  return updatedProduct;
}

export async function deleteProduct(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("products").delete().eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/stock-list-master");
  revalidatePath("/inbound");
  revalidatePath("/npl");
}

// --- EXPEDITION ACTIONS ---
export async function createExpedition(data: {
  warehouse_id: string;
  expedition_code: string;
  expedition_name: string;
  contact_person: string;
  phone: string;
  is_active: boolean;
}) {
  const supabase = await createClient();
  const { data: newExpedition, error } = await supabase
    .from("expeditions")
    .insert({
      warehouse_id: data.warehouse_id,
      expedition_code: data.expedition_code,
      expedition_name: data.expedition_name,
      contact_person: data.contact_person,
      phone: data.phone,
      is_active: data.is_active,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  revalidatePath("/stock-list-master");
  revalidatePath("/inbound");
  return newExpedition;
}

export async function updateExpedition(
  id: string,
  data: {
    expedition_name: string;
    contact_person?: string;
    phone?: string;
    is_active?: boolean;
  }
) {
  const supabase = await createClient();
  const { data: updatedExpedition, error } = await supabase
    .from("expeditions")
    .update({
      expedition_name: data.expedition_name,
      contact_person: data.contact_person,
      phone: data.phone,
      is_active: data.is_active,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  revalidatePath("/stock-list-master");
  revalidatePath("/inbound");
  return updatedExpedition;
}

export async function deleteExpedition(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("expeditions").delete().eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/stock-list-master");
  revalidatePath("/inbound");
}

// --- CLUSTER CONFIG ACTIONS ---
export async function createClusterConfigAction(data: {
  warehouse_id: string;
  cluster_char: string;
  cluster_name: string;
  default_lorong_count: number;
  default_baris_count: number;
  default_pallet_level: number;
  description?: string | null;
  is_active: boolean;
}) {
  const supabase = await createClient();
  const { data: newCluster, error } = await supabase
    .from("cluster_configs")
    .insert({
      warehouse_id: data.warehouse_id,
      cluster_char: data.cluster_char,
      cluster_name: data.cluster_name,
      default_lorong_count: data.default_lorong_count,
      default_baris_count: data.default_baris_count,
      default_pallet_level: data.default_pallet_level,
      description: data.description,
      is_active: data.is_active,
    })
    .select()
    .single();

  if (error) return { success: false, message: error.message };
  revalidatePath("/stock-list-master");
  revalidatePath("/warehouse-layout");
  return { success: true, data: newCluster };
}

export async function updateClusterConfigAction(
  id: string,
  data: {
    cluster_name?: string;
    default_lorong_count?: number;
    default_baris_count?: number;
    default_pallet_level?: number;
    is_active?: boolean;
  }
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("cluster_configs")
    .update({
      cluster_name: data.cluster_name,
      default_lorong_count: data.default_lorong_count,
      default_baris_count: data.default_baris_count,
      default_pallet_level: data.default_pallet_level,
      is_active: data.is_active,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) return { success: false, message: error.message };
  revalidatePath("/stock-list-master");
  revalidatePath("/warehouse-layout");
  return { success: true };
}

export async function deleteClusterConfigAction(id: string) {
  const supabase = await createClient();
  
  // First delete all cell overrides associated with this cluster
  const { error: overrideError } = await supabase
    .from("cluster_cell_overrides")
    .delete()
    .eq("cluster_config_id", id);
  
  if (overrideError) return { success: false, message: overrideError.message };
  
  // Then delete the cluster config
  const { error } = await supabase
    .from("cluster_configs")
    .delete()
    .eq("id", id);

  if (error) return { success: false, message: error.message };
  revalidatePath("/stock-list-master");
  revalidatePath("/warehouse-layout");
  return { success: true };
}

// --- CELL OVERRIDES ACTIONS ---
export async function saveCellOverrideAction(data: {
  id: string;
  cluster_config_id: string;
  lorong_start: number;
  lorong_end: number;
  baris_start: number | null;
  baris_end: number | null;
  custom_baris_count?: number | null;
  custom_pallet_level?: number | null;
  is_transit_area: boolean;
  is_disabled: boolean;
  note?: string | null;
}) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("cluster_cell_overrides")
    .upsert({
      id: data.id.startsWith("cco-") ? undefined : data.id, // Handle new vs existing
      cluster_config_id: data.cluster_config_id,
      lorong_start: data.lorong_start,
      lorong_end: data.lorong_end,
      baris_start: data.baris_start,
      baris_end: data.baris_end,
      custom_baris_count: data.custom_baris_count,
      custom_pallet_level: data.custom_pallet_level,
      is_transit_area: data.is_transit_area,
      is_disabled: data.is_disabled,
      note: data.note,
      updated_at: new Date().toISOString(),
    });

  if (error) return { success: false, message: error.message };
  revalidatePath("/stock-list-master");
  return { success: true };
}

export async function deleteCellOverrideAction(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("cluster_cell_overrides")
    .delete()
    .eq("id", id);

  if (error) return { success: false, message: error.message };
  revalidatePath("/stock-list-master");
  return { success: true };
}

// --- PRODUCT HOME ACTIONS ---
export async function createProductHome(data: {
  warehouse_id: string;
  product_id: string;
  cluster_char: string;
  lorong_start: number;
  lorong_end: number;
  baris_start: number;
  baris_end: number;
  max_pallet_per_location: number;
  priority: number;
  is_active: boolean;
}) {
  const supabase = await createClient();
  
  // Check for overlapping locations with same product (application-level validation)
  const { data: existing, error: checkError } = await supabase
    .from("product_homes")
    .select("*")
    .eq("warehouse_id", data.warehouse_id)
    .eq("product_id", data.product_id)
    .eq("cluster_char", data.cluster_char);
  
  if (checkError) throw new Error(`Validation error: ${checkError.message}`);
  
  // Check if new range overlaps with any existing home
  if (existing && existing.length > 0) {
    for (const home of existing) {
      const lorongOverlap = 
        (data.lorong_start >= home.lorong_start && data.lorong_start <= home.lorong_end) ||
        (data.lorong_end >= home.lorong_start && data.lorong_end <= home.lorong_end) ||
        (data.lorong_start <= home.lorong_start && data.lorong_end >= home.lorong_end);
      
      if (lorongOverlap) {
        const barisOverlap = 
          (data.baris_start >= home.baris_start && data.baris_start <= home.baris_end) ||
          (data.baris_end >= home.baris_start && data.baris_end <= home.baris_end) ||
          (data.baris_start <= home.baris_start && data.baris_end >= home.baris_end);
        
        if (barisOverlap) {
          throw new Error(
            `Lokasi overlap dengan home yang sudah ada! ` +
            `Existing: Cluster ${home.cluster_char}, L${home.lorong_start}-${home.lorong_end}, B${home.baris_start}-${home.baris_end}. ` +
            `Pilih range yang tidak overlap.`
          );
        }
      }
    }
  }
  
  const { data: newProductHome, error } = await supabase
    .from("product_homes")
    .insert({
      warehouse_id: data.warehouse_id,
      product_id: data.product_id,
      cluster_char: data.cluster_char,
      lorong_start: data.lorong_start,
      lorong_end: data.lorong_end,
      baris_start: data.baris_start,
      baris_end: data.baris_end,
      max_pallet_per_location: data.max_pallet_per_location,
      priority: data.priority,
      is_active: data.is_active,
    })
    .select()
    .single();

  if (error) {
    // Log full error for debugging
    console.error('Product Home Insert Error:', {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code
    });
    
    // Provide user-friendly error message
    if (error.message.includes('unique') || error.message.includes('duplicate key')) {
      throw new Error(
        `❌ Database Constraint Error!\n\n` +
        `Error: ${error.message}\n\n` +
        `Troubleshooting:\n` +
        `1. Pastikan migration sudah dijalankan\n` +
        `2. Restart Supabase connection/pooler\n` +
        `3. Check indexes: SELECT indexname FROM pg_indexes WHERE tablename = 'product_homes';\n\n` +
        `Jika masih error, constraint mungkin ada dengan nama lain. Share full error ke developer.`
      );
    }
    throw new Error(`Database error: ${error.message}`);
  }
  
  revalidatePath("/stock-list-master");
  revalidatePath("/inbound");
  revalidatePath("/npl");
  return newProductHome;
}

export async function updateProductHome(
  id: string,
  data: {
    cluster_char?: string;
    lorong_start?: number;
    lorong_end?: number;
    baris_start?: number;
    baris_end?: number;
    max_pallet_per_location?: number;
    priority?: number;
    is_active?: boolean;
  }
) {
  const supabase = await createClient();
  const { data: updatedProductHome, error } = await supabase
    .from("product_homes")
    .update({
      ...data,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  revalidatePath("/stock-list-master");
  revalidatePath("/inbound");
  revalidatePath("/npl");
  return updatedProductHome;
}

export async function deleteProductHome(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("product_homes").delete().eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/stock-list-master");
  revalidatePath("/inbound");
  revalidatePath("/npl");
}