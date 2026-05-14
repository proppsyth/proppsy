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
  const { data: profile } = await admin.from('profiles').select('account_status').eq('id', userId).single()
  await admin.from('profiles').update({ account_status: 'approved' }).eq('id', userId)
  if (profile?.account_status !== 'approved') {
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

export async function deleteUser(userId: string): Promise<{ error?: string }> {
  try {
    await assertAdmin()
    const admin = await createAdminClient()
    await admin.from('profiles').delete().eq('id', userId)
    const { error } = await admin.auth.admin.deleteUser(userId)
    if (error) return { error: error.message }
    revalidatePath('/admin/users')
    return {}
  } catch {
    return { error: 'ไม่มีสิทธิ์' }
  }
}
