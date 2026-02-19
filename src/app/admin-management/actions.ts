'use server'

import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function registerUser(formData: any) {
  try {
    // Hash password sebelum disimpan ke tabel database
    const hashedPassword = await bcrypt.hash(formData.password, 10)

    // 1. Daftarkan ke Supabase Auth (Otomatis ter-hash di sistem internal Supabase)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: formData.email,
      password: formData.password,
      email_confirm: true,
      user_metadata: {
        username: formData.username  // ✅ Set username di metadata untuk login
      }
    })
    if (authError) throw new Error(authError.message)

    // 2. Masukkan ke Tabel public.users dengan password yang sudah di-hash
    const { error: dbError } = await supabaseAdmin.from('users').insert([{
      id: authData.user.id,
      username: formData.username,
      full_name: formData.fullName,
      email: formData.email,
      role: formData.role,
      warehouse_id: formData.warehouseId || null,
      password_hash: hashedPassword, // Tersimpan dalam bentuk hash di tabel Anda
      phone: formData.phone,
      is_active: true
    }])

    if (dbError) {
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      throw new Error(dbError.message)
    }
    return { success: true }
  } catch (error: any) {
    return { error: error.message }
  }
}

export async function updateUser(userId: string, formData: any) {
  try {
    const authUpdate: any = { 
      email: formData.email, 
      email_confirm: true,
      user_metadata: {
        username: formData.username  // ✅ Update username di metadata juga
      }
    }
    const dbUpdate: any = {
      username: formData.username,
      full_name: formData.fullName,
      email: formData.email,
      phone: formData.phone,
      role: formData.role,
      warehouse_id: formData.role === 'developer' ? null : formData.warehouseId,
      updated_at: new Date().toISOString()
    }

    // Jika admin mengisi kolom password, hash dan update di kedua tempat
    if (formData.password) {
      authUpdate.password = formData.password
      dbUpdate.password_hash = await bcrypt.hash(formData.password, 10)
    }

    // Update Auth
    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(userId, authUpdate)
    if (authError) throw new Error("Auth Error: " + authError.message)

    // Update Tabel Database
    const { error: dbError } = await supabaseAdmin.from('users').update(dbUpdate).eq('id', userId)
    if (dbError) throw new Error("Database Error: " + dbError.message)

    return { success: true }
  } catch (error: any) {
    return { error: error.message }
  }
}

export async function deleteUser(userId: string) {
  try {
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId)
    if (authError) throw new Error(authError.message)

    const { error: dbError } = await supabaseAdmin.from('users').delete().eq('id', userId)
    if (dbError) throw new Error(dbError.message)

    return { success: true }
  } catch (error: any) {
    return { error: error.message }
  }
}