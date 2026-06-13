'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getRequireApproval } from '@/lib/settings'
import { grantStarterCredits } from '@/lib/credits/actions'

export async function saveConsent(): Promise<{ error?: string; needsProfileSetup?: boolean }> {
  // Use createClient (anon key + cookies) for auth.getUser() — service-role key
  // does not reliably resolve the current user from cookies in all contexts.
  const [supabase, requireApproval] = await Promise.all([createClient(), getRequireApproval()])
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'ไม่พบผู้ใช้ กรุณาเข้าสู่ระบบใหม่' }

  const now = new Date().toISOString()

  // Use service-role client (no RLS) for the profile update.
  // createServiceClient() is sync and doesn't need cookies for DB writes.
  const admin = createServiceClient()

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
  // Non-fatal: wrap in try/catch so a credits failure doesn't block consent submission.
  try { await grantStarterCredits(user.id) } catch { /* will retry on next login if needed */ }

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
