'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { grantStarterCredits } from '@/lib/credits/actions'
import type { Role, AccountStatus, Plan } from '@/types'

async function assertAdmin(): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') throw new Error('Forbidden')
}

export async function approveUser(userId: string): Promise<void> {
  await assertAdmin()
  const admin = await createAdminClient()
  const [{ data: profile }, { data: credits }] = await Promise.all([
    admin.from('profiles').select('account_status').eq('id', userId).single(),
    admin.from('credits').select('total_earned').eq('user_id', userId).maybeSingle(),
  ])
  await admin.from('profiles').update({ account_status: 'approved' }).eq('id', userId)
  // Only grant starter credits if the user hasn't received any yet
  // (credits are granted at registration — this prevents double-granting)
  if (profile?.account_status !== 'approved' && !(credits && credits.total_earned > 0)) {
    await grantStarterCredits(userId)
  }
  revalidatePath('/admin/users')
}

export async function rejectUser(userId: string): Promise<void> {
  await assertAdmin()
  const admin = await createAdminClient()
  await admin.from('profiles').update({ account_status: 'rejected' }).eq('id', userId)
  revalidatePath('/admin/users')
}

export async function updateUser(userId: string, data: {
  name?: string
  nickname?: string
  phone?: string
  role?: Role
  account_status?: AccountStatus
  plan?: Plan
  plan_expires_at?: string | null
}): Promise<{ error?: string }> {
  try {
    await assertAdmin()
    const admin = await createAdminClient()
    const { error } = await admin.from('profiles').update(data).eq('id', userId)
    if (error) return { error: error.message }
    revalidatePath('/admin/users')
    return {}
  } catch {
    return { error: 'ไม่มีสิทธิ์' }
  }
}

export async function deactivateUser(userId: string, reason?: string): Promise<{ error?: string }> {
  try {
    await assertAdmin()
    const admin = await createAdminClient()
    const { error } = await admin
      .from('profiles')
      .update({
        deleted_at: new Date().toISOString(),
        deletion_reason: reason ?? 'ปิดการใช้งานโดยแอดมิน',
      })
      .eq('id', userId)
    if (error) return { error: error.message }
    // Kill active sessions — non-fatal, Supabase client returns {error} rather than throwing
    await admin.rpc('kill_user_sessions', { p_user_id: userId })
    revalidatePath('/admin/users')
    return {}
  } catch {
    return { error: 'ไม่มีสิทธิ์' }
  }
}

export async function restoreUser(userId: string): Promise<{ error?: string }> {
  try {
    await assertAdmin()
    const admin = await createAdminClient()
    const { error } = await admin
      .from('profiles')
      .update({ deleted_at: null, deletion_reason: null })
      .eq('id', userId)
    if (error) return { error: error.message }
    revalidatePath('/admin/users')
    return {}
  } catch {
    return { error: 'ไม่มีสิทธิ์' }
  }
}
