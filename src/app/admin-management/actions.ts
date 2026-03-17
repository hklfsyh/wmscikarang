'use server'

import { createClient } from '@supabase/supabase-js'
import { createClient as createSessionClient } from '@/utils/supabase/server'
import bcrypt from 'bcryptjs'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

type ManagedRole = 'developer' | 'admin_cabang' | 'admin_warehouse' | 'other_user'

function normalizeRole(role: unknown): ManagedRole {
  if (
    role === 'developer' ||
    role === 'admin_cabang' ||
    role === 'admin_warehouse' ||
    role === 'other_user'
  ) {
    return role
  }
  throw new Error('Role tidak valid.')
}

async function getActorProfile() {
  const supabase = await createSessionClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error('Sesi berakhir. Silakan login ulang.')

  const { data: profiles } = await supabase.rpc('get_current_user_profile')
  if (profiles && profiles.length > 0) {
    return {
      id: user.id,
      role: profiles[0].role as string,
      warehouse_id: profiles[0].warehouse_id as string | null,
    }
  }

  const { data: fallbackProfile, error: fallbackError } = await supabase
    .from('users')
    .select('role, warehouse_id')
    .eq('id', user.id)
    .single()

  if (fallbackError || !fallbackProfile) {
    throw new Error('Profil user tidak ditemukan.')
  }

  return {
    id: user.id,
    role: fallbackProfile.role as string,
    warehouse_id: fallbackProfile.warehouse_id as string | null,
  }
}

function ensureCanManageRole(
  actor: { role: string; warehouse_id: string | null },
  targetRole: ManagedRole,
  targetWarehouseId: string | null
) {
  if (actor.role === 'developer') return

  if (actor.role === 'admin_cabang') {
    if (targetRole !== 'admin_warehouse' && targetRole !== 'other_user') {
      throw new Error('Admin Cabang hanya bisa mengelola Admin Warehouse dan Other User.')
    }

    if (!actor.warehouse_id) {
      throw new Error('Admin Cabang tidak memiliki warehouse aktif.')
    }

    if (!targetWarehouseId || targetWarehouseId !== actor.warehouse_id) {
      throw new Error('Admin Cabang hanya bisa mengelola user di warehouse sendiri.')
    }
    return
  }

  throw new Error('Anda tidak memiliki akses untuk mengelola user.')
}

export async function registerUser(formData: any) {
  try {
    const actor = await getActorProfile()
    const targetRole = normalizeRole(formData.role)
    const targetWarehouseId = targetRole === 'developer' ? null : (formData.warehouseId || null)

    ensureCanManageRole(actor, targetRole, targetWarehouseId)

    if (targetRole !== 'developer' && !targetWarehouseId) {
      throw new Error('Warehouse wajib diisi untuk role non-developer.')
    }

    // Hash password sebelum disimpan ke tabel database
    const hashedPassword = await bcrypt.hash(formData.password, 10)

    // 1. Daftarkan ke Supabase Auth (Otomatis ter-hash di sistem internal Supabase)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: formData.email,
      password: formData.password,
      email_confirm: true,
      user_metadata: {
        username: formData.username,
        email_verified: true
      }
    })
    if (authError) throw new Error(authError.message)

    // 2. Masukkan ke Tabel public.users dengan password yang sudah di-hash
    const { error: dbError } = await supabaseAdmin.from('users').insert([{
      id: authData.user.id,
      username: formData.username,
      full_name: formData.fullName,
      email: formData.email,
      role: targetRole,
      warehouse_id: targetWarehouseId,
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
    const actor = await getActorProfile()

    const { data: targetUser, error: targetError } = await supabaseAdmin
      .from('users')
      .select('id, role, warehouse_id')
      .eq('id', userId)
      .single()

    if (targetError || !targetUser) {
      throw new Error('User target tidak ditemukan.')
    }

    if (actor.role === 'admin_cabang') {
      if (targetUser.role !== 'admin_warehouse' && targetUser.role !== 'other_user') {
        throw new Error('Admin Cabang hanya bisa mengedit Admin Warehouse dan Other User.')
      }
      if (!actor.warehouse_id || targetUser.warehouse_id !== actor.warehouse_id) {
        throw new Error('Admin Cabang hanya bisa mengedit user di warehouse sendiri.')
      }
    } else if (actor.role !== 'developer') {
      throw new Error('Anda tidak memiliki akses untuk mengedit user.')
    }

    const targetRole = normalizeRole(formData.role)
    const targetWarehouseId = targetRole === 'developer' ? null : (formData.warehouseId || null)
    ensureCanManageRole(actor, targetRole, targetWarehouseId)

    if (targetRole !== 'developer' && !targetWarehouseId) {
      throw new Error('Warehouse wajib diisi untuk role non-developer.')
    }

    const authUpdate: any = { 
      email: formData.email, 
      email_confirm: true,
      user_metadata: {
        username: formData.username,
        email_verified: true
      }
    }
    const dbUpdate: any = {
      username: formData.username,
      full_name: formData.fullName,
      email: formData.email,
      phone: formData.phone,
      role: targetRole,
      warehouse_id: targetWarehouseId,
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
    const actor = await getActorProfile()

    const { data: targetUser, error: targetError } = await supabaseAdmin
      .from('users')
      .select('id, role, warehouse_id')
      .eq('id', userId)
      .single()

    if (targetError || !targetUser) {
      throw new Error('User target tidak ditemukan.')
    }

    if (targetUser.id === actor.id) {
      throw new Error('Tidak bisa menghapus akun sendiri.')
    }

    if (actor.role === 'admin_cabang') {
      if (targetUser.role !== 'admin_warehouse' && targetUser.role !== 'other_user') {
        throw new Error('Admin Cabang hanya bisa menghapus Admin Warehouse dan Other User.')
      }
      if (!actor.warehouse_id || targetUser.warehouse_id !== actor.warehouse_id) {
        throw new Error('Admin Cabang hanya bisa menghapus user di warehouse sendiri.')
      }
    } else if (actor.role !== 'developer') {
      throw new Error('Anda tidak memiliki akses untuk menghapus user.')
    }

    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId)
    if (authError) throw new Error(authError.message)

    const { error: dbError } = await supabaseAdmin.from('users').delete().eq('id', userId)
    if (dbError) throw new Error(dbError.message)

    return { success: true }
  } catch (error: any) {
    return { error: error.message }
  }
}