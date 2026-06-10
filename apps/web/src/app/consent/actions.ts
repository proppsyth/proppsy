'use server'

import { createAdminClient } from '@/lib/supabase/server'

export async function saveConsent(): Promise<{ error?: string }> {
  const admin = await createAdminClient()
  const { data: { user } } = await admin.auth.getUser()
  if (!user) return { error: 'ไม่พบผู้ใช้' }

  const now = new Date().toISOString()

  const { error } = await admin
    .from('profiles')
    .update({
      accepted_terms_at: now,
      accepted_privacy_at: now,
      accepted_data_controller_confirmation_at: now,
    })
    .eq('id', user.id)

  if (error) return { error: error.message }

  // OAuth users (Google, etc.) complete onboarding here instead of via the email
  // registration form. Approve any account still in 'pending' state.
  // The .eq('account_status', 'pending') guard ensures 'rejected' is never overridden.
  await admin
    .from('profiles')
    .update({ account_status: 'approved' })
    .eq('id', user.id)
    .eq('account_status', 'pending')

  return {}
}
