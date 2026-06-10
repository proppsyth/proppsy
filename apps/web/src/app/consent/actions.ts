'use server'

import { createAdminClient } from '@/lib/supabase/server'

export async function saveConsent(): Promise<{ error?: string }> {
  const admin = await createAdminClient()
  const { data: { user } } = await admin.auth.getUser()
  if (!user) return { error: 'ไม่พบผู้ใช้' }

  const now = new Date().toISOString()

  // Single atomic update: consent timestamps + account approval together.
  // Splitting into two queries risks a partial-success state where timestamps are set
  // but account_status stays 'pending' (if the second query fails silently).
  // neq('account_status', 'rejected') ensures a rejected account is never auto-approved.
  const { error } = await admin
    .from('profiles')
    .update({
      accepted_terms_at: now,
      accepted_privacy_at: now,
      accepted_data_controller_confirmation_at: now,
      account_status: 'approved',
    })
    .eq('id', user.id)
    .neq('account_status', 'rejected')

  if (error) return { error: error.message }
  return {}
}
