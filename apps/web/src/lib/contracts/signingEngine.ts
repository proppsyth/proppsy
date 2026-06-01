// Signing Engine
// Helpers for e-sign lifecycle: status transitions when signers sign.
// Called from lib/sign/actions.ts (service-client context).

import type { SupabaseClient } from '@supabase/supabase-js'

// Called after every signature submission.
// When all signers have signed: moves to 'signed' status only.
// Locking (is_finalized) and stock activation are intentionally separate —
// the agent must explicitly press "ล็อกสัญญา" to finalize.
export async function handleAllSignedIfComplete(
  supabase: SupabaseClient,
  contractId: string,
  justSignedId: string,
  now: string,
): Promise<void> {
  const { data: remaining } = await supabase
    .from('contract_signers')
    .select('id, status')
    .eq('contract_id', contractId)
    .neq('id', justSignedId)

  const allSigned = (remaining ?? []).every(s => (s as { status: string }).status === 'signed')
  if (!allSigned) {
    await supabase.from('contracts').update({ status: 'partially_signed' }).eq('id', contractId)
    return
  }

  // All signed → mark as 'signed' but do NOT auto-lock (is_finalized stays false).
  // The agent reviews, may regenerate documents, then manually locks via finalizeManually().
  await supabase.from('contracts').update({
    status: 'signed',
    signed_at: now,
  }).eq('id', contractId)
}

// Transition contract to sent_for_sign status
export async function markSentForSigning(
  supabase: SupabaseClient,
  contractId: string,
  agentUid: string,
): Promise<{ error?: string }> {
  const { error } = await supabase
    .from('contracts')
    .update({ status: 'sent_for_sign' })
    .eq('id', contractId)
    .eq('agent_uid', agentUid)
  return error ? { error: error.message } : {}
}
