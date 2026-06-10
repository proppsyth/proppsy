'use server'

import { createClient } from '@/lib/supabase/server'

export async function saveConsent(): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'ไม่พบผู้ใช้' }

  const now = new Date().toISOString()
  const { error } = await supabase
    .from('profiles')
    .update({
      accepted_terms_at: now,
      accepted_privacy_at: now,
      accepted_data_controller_confirmation_at: now,
    })
    .eq('id', user.id)

  if (error) return { error: error.message }
  return {}
}
