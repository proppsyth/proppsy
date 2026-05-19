// Signing Engine
// Helpers for e-sign lifecycle: status transitions when signers sign.
// Called from lib/sign/actions.ts (service-client context).

import type { SupabaseClient } from '@supabase/supabase-js'
import { setStockRented } from './lifecycleEngine'

// Called after every signature submission.
// If all signers have signed: auto-finalizes and activates lease.
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

  const { data: contract } = await supabase
    .from('contracts')
    .select('doc_type, stock_id, docx_url, pdf_url, agent_uid, contract_category')
    .eq('id', contractId)
    .single()

  if (!contract) return

  const isLease = (contract as { contract_category?: string }).contract_category === 'lease'

  await supabase.from('contracts').update({
    status: isLease ? 'active' : 'signed',
    signed_at: now,
    is_finalized: true,
    finalized_at: now,
    finalized_docx_url: (contract as { docx_url?: string | null }).docx_url ?? null,
    finalized_pdf_url:  (contract as { pdf_url?: string | null }).pdf_url ?? null,
  }).eq('id', contractId)

  if (isLease && (contract as { stock_id?: string | null }).stock_id) {
    await setStockRented(
      supabase,
      (contract as { stock_id: string }).stock_id,
      (contract as { agent_uid: string }).agent_uid,
    )
  }
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
