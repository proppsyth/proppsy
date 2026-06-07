'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

async function assertAdmin(): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') throw new Error('Forbidden')
}

function revalidate() {
  revalidatePath('/admin/partners')
  revalidatePath('/')
}

export async function createPartner(data: {
  name_th: string
  name_en?: string
  logo_url?: string
  website?: string
  sort_order: number
  is_active: boolean
}): Promise<{ error?: string }> {
  try {
    await assertAdmin()
    const admin = await createAdminClient()
    const { error } = await admin.from('partners').insert(data)
    if (error) return { error: error.message }
    revalidate()
    return {}
  } catch {
    return { error: 'ไม่มีสิทธิ์' }
  }
}

export async function updatePartner(
  id: string,
  data: {
    name_th?: string
    name_en?: string | null
    logo_url?: string | null
    website?: string | null
    sort_order?: number
    is_active?: boolean
  }
): Promise<{ error?: string }> {
  try {
    await assertAdmin()
    const admin = await createAdminClient()
    const { error } = await admin.from('partners').update(data).eq('id', id)
    if (error) return { error: error.message }
    revalidate()
    return {}
  } catch {
    return { error: 'ไม่มีสิทธิ์' }
  }
}

export async function togglePartnerActive(id: string, currentActive: boolean): Promise<{ error?: string }> {
  try {
    await assertAdmin()
    const admin = await createAdminClient()
    const { error } = await admin.from('partners').update({ is_active: !currentActive }).eq('id', id)
    if (error) return { error: error.message }
    revalidate()
    return {}
  } catch {
    return { error: 'ไม่มีสิทธิ์' }
  }
}

export async function deletePartner(id: string): Promise<{ error?: string }> {
  try {
    await assertAdmin()
    const admin = await createAdminClient()
    const { error } = await admin.from('partners').delete().eq('id', id)
    if (error) return { error: error.message }
    revalidate()
    return {}
  } catch {
    return { error: 'ไม่มีสิทธิ์' }
  }
}
