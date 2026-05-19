// Document Engine
// Handles document package creation and management.
// Document generation (DOCX/PDF) stays in actions.ts — this layer manages packages.

import type { SupabaseClient } from '@supabase/supabase-js'

async function nextPackageId(supabase: SupabaseClient): Promise<string> {
  const { data } = await supabase
    .from('document_packages')
    .select('id')
    .like('id', 'PKG-%')
    .order('id', { ascending: false })
    .limit(1)
    .maybeSingle()
  const num = data?.id ? (parseInt((data.id as string).slice(4)) || 0) : 0
  return `PKG-${String(num + 1).padStart(4, '0')}`
}

// Create a document package for a finalized lease.
// Returns the package ID or an error.
export async function createLeasePackage(
  supabase: SupabaseClient,
  leaseId: string,
  agentUid: string,
): Promise<{ id: string } | { error: string }> {
  // Avoid duplicate packages for the same lease
  const { data: existing } = await supabase
    .from('document_packages')
    .select('id')
    .eq('master_contract_id', leaseId)
    .eq('agent_uid', agentUid)
    .maybeSingle()

  if (existing) return { id: (existing as { id: string }).id }

  const id = await nextPackageId(supabase)

  const { error } = await supabase.from('document_packages').insert({
    id,
    agent_uid: agentUid,
    master_contract_id: leaseId,
    label: `ชุดเอกสาร ${leaseId}`,
    status: 'draft',
  })

  if (error) return { error: error.message }

  // Seed package with the lease itself as item 0
  await supabase.from('document_package_items').insert({
    package_id: id,
    contract_id: leaseId,
    doc_type: 'rental',
    label: 'สัญญาเช่า',
    sort_order: 0,
  })

  return { id }
}

// Add a child document to an existing package
export async function addItemToPackage(
  supabase: SupabaseClient,
  packageId: string,
  contractId: string,
  docType: string,
  label: string,
  sortOrder: number,
): Promise<{ error?: string }> {
  const { error } = await supabase.from('document_package_items').insert({
    package_id: packageId,
    contract_id: contractId,
    doc_type: docType,
    label,
    sort_order: sortOrder,
  })
  return error ? { error: error.message } : {}
}
