'use server'

import { createAdminClient } from '@/lib/supabase/server'
import { getRequireApproval } from '@/lib/settings'
import { grantStarterCredits } from '@/lib/credits/actions'

export async function saveConsent(): Promise<{ error?: string; needsProfileSetup?: boolean }> {
  const [admin, requireApproval] = await Promise.all([createAdminClient(), getRequireApproval()])
  const { data: { user } } = await admin.auth.getUser()
  if (!user) return { error: 'ไม่พบผู้ใช้' }

  const now = new Date().toISOString()

  // When require_approval is on, set consent timestamps only — do not approve.
  // When off, consent + approval are atomic to prevent partial-success state.
  // neq('account_status', 'rejected') ensures rejected accounts cannot self-approve.
  const { error } = await admin
    .from('profiles')
    .update(requireApproval
      ? {
          accepted_terms_at: now,
          accepted_privacy_at: now,
          accepted_data_controller_confirmation_at: now,
        }
      : {
          accepted_terms_at: now,
          accepted_privacy_at: now,
          accepted_data_controller_confirmation_at: now,
          account_status: 'approved',
        }
    )
    .eq('id', user.id)
    .neq('account_status', 'rejected')

  if (error) return { error: error.message }

  // Always grant starter credits immediately so users can use AI/features while pending.
  // approveUser() checks credits.total_earned to prevent double-granting.
  await grantStarterCredits(user.id)

  // Check if Google user still needs to fill in profile info (phone, national_id, id_card)
  const { data: profile } = await admin
    .from('profiles')
    .select('auth_provider, phone, national_id')
    .eq('id', user.id)
    .single()

  const needsProfileSetup =
    profile?.auth_provider === 'google' &&
    (!profile?.phone || !profile?.national_id)

  return { needsProfileSetup }
}
