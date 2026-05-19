'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

async function assertAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') throw new Error('Forbidden')
  return { supabase, user }
}

export async function updateSetting(
  key: string,
  value: unknown
): Promise<{ error?: string }> {
  try {
    const { supabase, user } = await assertAdmin()
    const { error } = await supabase
      .from('settings')
      .update({
        value:      value,
        updated_at: new Date().toISOString(),
        updated_by: user.id,
      })
      .eq('key', key)
    if (error) return { error: error.message }
    revalidatePath('/admin/settings')
    return {}
  } catch {
    return { error: 'ไม่มีสิทธิ์' }
  }
}
