'use server'

import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function createWarehouse(formData: {
  warehouseCode: string;
  cityName: string;
  address: string;
  phone?: string;
}) {
  try {
    const { error } = await supabaseAdmin.from('warehouses').insert([{
      warehouse_code: formData.warehouseCode,
      city_name: formData.cityName,
      address: formData.address,
      phone: formData.phone || null,
      is_active: true
    }])

    if (error) throw new Error(error.message)

    return { success: true }
  } catch (error: any) {
    return { error: error.message }
  }
}

export async function updateWarehouse(warehouseId: string, formData: {
  warehouseCode: string;
  cityName: string;
  address: string;
  phone?: string;
}) {
  try {
    const { error } = await supabaseAdmin.from('warehouses').update({
      warehouse_code: formData.warehouseCode,
      city_name: formData.cityName,
      address: formData.address,
      phone: formData.phone || null,
      updated_at: new Date().toISOString()
    }).eq('id', warehouseId)

    if (error) throw new Error(error.message)

    return { success: true }
  } catch (error: any) {
    return { error: error.message }
  }
}

export async function deleteWarehouse(warehouseId: string) {
  try {
    const { error } = await supabaseAdmin.from('warehouses').delete().eq('id', warehouseId)

    if (error) throw new Error(error.message)

    return { success: true }
  } catch (error: any) {
    return { error: error.message }
  }
}

export async function toggleWarehouseStatus(warehouseId: string, currentStatus: boolean) {
  try {
    const { error } = await supabaseAdmin.from('warehouses').update({
      is_active: !currentStatus,
      updated_at: new Date().toISOString()
    }).eq('id', warehouseId)

    if (error) throw new Error(error.message)

    return { success: true }
  } catch (error: any) {
    return { error: error.message }
  }
}