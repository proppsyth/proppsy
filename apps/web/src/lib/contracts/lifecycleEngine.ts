// Contract Lifecycle Engine
// Pure business-logic helpers that take a Supabase client.
// Never 'use server' — imported by server actions which own auth context.

import type { SupabaseClient } from '@supabase/supabase-js'

// ── Stock transitions ─────────────────────────────────────────

export async function setStockReserved(supabase: SupabaseClient, stockId: string, agentUid: string) {
  await supabase.from('stock').update({ status: 'reserved' }).eq('id', stockId).eq('agent_uid', agentUid)
}

export async function setStockPendingMoveIn(supabase: SupabaseClient, stockId: string, agentUid: string) {
  await supabase.from('stock').update({ status: 'pending_move_in' }).eq('id', stockId).eq('agent_uid', agentUid)
}

export async function setStockRented(supabase: SupabaseClient, stockId: string, agentUid: string) {
  await supabase.from('stock').update({ status: 'rented', is_published: false, published_at: null }).eq('id', stockId).eq('agent_uid', agentUid)
}

export async function setStockAvailable(supabase: SupabaseClient, stockId: string, agentUid: string) {
  await supabase.from('stock').update({ status: 'available' }).eq('id', stockId).eq('agent_uid', agentUid)
}

// ── Snapshot capture ──────────────────────────────────────────

export async function captureFinalizationSnapshot(
  supabase: SupabaseClient,
  contractId: string,
  agentUid: string,
): Promise<void> {
  const { data } = await supabase
    .from('contracts')
    .select('*, stock:stock(*), owner:owners(*), customer:customers(*)')
    .eq('id', contractId)
    .eq('agent_uid', agentUid)
    .single()

  if (!data) return

  await supabase
    .from('contracts')
    .update({ finalized_snapshot: data })
    .eq('id', contractId)
    .eq('agent_uid', agentUid)
}

// ── Timeline events ───────────────────────────────────────────

export async function appendTimelineEvent(
  supabase: SupabaseClient,
  contractId: string,
  masterContractId: string | null,
  agentUid: string,
  eventType: string,
  description?: string,
  relatedContractId?: string,
): Promise<void> {
  await supabase.from('contract_timeline_events').insert({
    contract_id: contractId,
    master_contract_id: masterContractId ?? null,
    agent_uid: agentUid,
    event_type: eventType,
    description: description ?? null,
    related_contract_id: relatedContractId ?? null,
  })
}

// ── Category helper ───────────────────────────────────────────

import type { ContractCategory, ContractDocType } from '@/types'

export function docTypeToCategory(docType: ContractDocType): ContractCategory {
  if (docType === 'reservation') return 'reservation'
  if (docType === 'rental') return 'lease'
  return 'child'
}
