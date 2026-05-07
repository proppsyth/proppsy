'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

async function assertAdmin(): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (profile?.role !== 'admin') throw new Error('Forbidden')
}

export async function approveUser(userId: string): Promise<void> {
  await assertAdmin()
  const admin = await createAdminClient()
  await admin.from('profiles').update({ account_status: 'approved' }).eq('id', userId)
  revalidatePath('/admin/users')
}

export async function rejectUser(userId: string): Promise<void> {
  await assertAdmin()
  const admin = await createAdminClient()
  await admin.from('profiles').update({ account_status: 'rejected' }).eq('id', userId)
  revalidatePath('/admin/users')
}
