'use server'

import { createServiceClient, createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { SignerRole, ContractSigner } from '@/types'
import { handleAllSignedIfComplete } from '@/lib/contracts/signingEngine'

// ─── Public: fetch signer + contract for sign page ────────────────────────

export async function getPublicContractForSigning(token: string) {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('contract_signers')
    .select(`
      *,
      contract:contracts(
        id, doc_type, status, signed_at, docx_url,
        rent_price, deposit_amount, deposit_months, contract_months,
        move_in_date, end_date,
        stock:stock(id, unit_no, unit_name, building, floor, room_type, project_name),
        owner:owners(id, prefix, first_name_th, last_name_th, nickname, phone),
        customer:customers(id, prefix, first_name_th, last_name_th, nickname, phone)
      )
    `)
    .eq('sign_token', token)
    .single()

  return data
}

// ─── Public: record that signer opened the link ────────────────────────────

export async function recordSignerViewed(
  token: string,
  userAgent: string,
) {
  const supabase = createServiceClient()
  const { data: signer } = await supabase
    .from('contract_signers')
    .select('id, contract_id, status')
    .eq('sign_token', token)
    .single()

  if (!signer || signer.status !== 'pending') return

  const now = new Date().toISOString()

  await supabase
    .from('contract_signers')
    .update({ status: 'viewed', viewed_at: now, updated_at: now })
    .eq('id', signer.id)

  await supabase
    .from('contracts')
    .update({ status: 'viewed', viewed_at: now })
    .eq('id', signer.contract_id)
    .in('status', ['sent', 'sent_for_sign'])

  await supabase.from('contract_sign_events').insert({
    contract_id: signer.contract_id,
    signer_id: signer.id,
    event_type: 'link_opened',
    user_agent: userAgent,
  })
}

// ─── Public: submit signature ──────────────────────────────────────────────

export async function submitSignature(params: {
  token: string
  signatureDataUrl: string | null
  signatureType: 'drawn' | 'typed'
  signerName: string
  userAgent: string
}): Promise<{ error?: string; success?: boolean }> {
  const { token, signatureDataUrl, signatureType, signerName, userAgent } = params
  const supabase = createServiceClient()

  const { data: signer } = await supabase
    .from('contract_signers')
    .select('id, contract_id, status, signer_role')
    .eq('sign_token', token)
    .single()

  if (!signer) return { error: 'ไม่พบลิงก์ลงนาม' }
  if (signer.status === 'signed') return { error: 'ลงนามแล้ว' }

  let signatureUrl: string | null = null

  if (signatureDataUrl) {
    const base64Data = signatureDataUrl.replace(/^data:image\/\w+;base64,/, '')
    const buffer = Buffer.from(base64Data, 'base64')
    const path = `${signer.contract_id}/${signer.id}.png`

    const { error: uploadError } = await supabase.storage
      .from('signatures')
      .upload(path, buffer, { contentType: 'image/png', upsert: true })

    if (uploadError) return { error: 'อัปโหลดลายเซ็นไม่สำเร็จ: ' + uploadError.message }

    const { data: { publicUrl } } = supabase.storage.from('signatures').getPublicUrl(path)
    signatureUrl = publicUrl
  }

  const now = new Date().toISOString()

  await supabase
    .from('contract_signers')
    .update({
      status: 'signed',
      signed_at: now,
      signature_url: signatureUrl,
      signature_type: signatureType,
      signed_name: signerName || null,
      user_agent: userAgent,
      updated_at: now,
    })
    .eq('id', signer.id)

  // Auto-save signature to owner/customer profile
  if (signatureUrl && signer.signer_role) {
    const { data: contract } = await supabase
      .from('contracts')
      .select('owner_id, customer_id')
      .eq('id', signer.contract_id)
      .single()

    if (contract) {
      if (signer.signer_role === 'owner' && contract.owner_id) {
        await supabase.from('owners').update({ signature_url: signatureUrl }).eq('id', contract.owner_id)
      } else if (signer.signer_role === 'tenant' && contract.customer_id) {
        await supabase.from('customers').update({ signature_url: signatureUrl }).eq('id', contract.customer_id)
      }
    }
  }

  // Delegate all-signed detection + finalization to the signing engine
  await handleAllSignedIfComplete(supabase, signer.contract_id, signer.id, now)

  await supabase.from('contract_sign_events').insert({
    contract_id: signer.contract_id,
    signer_id: signer.id,
    event_type: 'signed',
    actor_name: signerName,
    user_agent: userAgent,
  })

  return { success: true }
}

// ─── Agent: add signer ─────────────────────────────────────────────────────

export async function addContractSigner(
  contractId: string,
  signerRole: SignerRole,
  signerName: string,
  signerPhone: string,
): Promise<{ error?: string; signer?: ContractSigner }> {
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return { error: 'ไม่ได้รับอนุญาต' }

  const supabase = createServiceClient()

  const { data: contract } = await supabase
    .from('contracts')
    .select('id')
    .eq('id', contractId)
    .eq('agent_uid', user.id)
    .single()

  if (!contract) return { error: 'ไม่พบสัญญา' }

  const { data: existing } = await supabase
    .from('contract_signers')
    .select('sort_order')
    .eq('contract_id', contractId)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle()

  const sortOrder = (existing?.sort_order ?? -1) + 1

  const { data: newSigner, error } = await supabase
    .from('contract_signers')
    .insert({
      contract_id: contractId,
      agent_uid: user.id,
      signer_role: signerRole,
      signer_name: signerName.trim() || null,
      signer_phone: signerPhone.trim() || null,
      sort_order: sortOrder,
    })
    .select()
    .single()

  if (error || !newSigner) return { error: 'เพิ่มผู้ลงนามไม่สำเร็จ' }

  await supabase.from('contract_sign_events').insert({
    contract_id: contractId,
    signer_id: newSigner.id,
    event_type: 'signer_added',
    actor_name: signerName,
    actor_role: signerRole,
  })

  revalidatePath(`/contracts/${contractId}`)
  return { signer: newSigner as ContractSigner }
}

// ─── Agent: remove signer ──────────────────────────────────────────────────

export async function removeContractSigner(
  signerId: string,
  contractId: string,
): Promise<{ error?: string }> {
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return { error: 'ไม่ได้รับอนุญาต' }

  const supabase = createServiceClient()

  const { error } = await supabase
    .from('contract_signers')
    .delete()
    .eq('id', signerId)
    .eq('agent_uid', user.id)
    .eq('status', 'pending')

  if (error) return { error: 'ลบไม่สำเร็จ (อาจเซ็นแล้ว)' }

  revalidatePath(`/contracts/${contractId}`)
  return {}
}

// ─── Agent: regenerate token ───────────────────────────────────────────────

export async function regenerateSignerToken(
  signerId: string,
  contractId: string,
): Promise<{ error?: string; sign_token?: string }> {
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return { error: 'ไม่ได้รับอนุญาต' }

  const supabase = createServiceClient()
  const newToken = crypto.randomUUID()

  const { error } = await supabase
    .from('contract_signers')
    .update({
      sign_token: newToken,
      status: 'pending',
      viewed_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', signerId)
    .eq('agent_uid', user.id)
    .neq('status', 'signed')

  if (error) return { error: 'สร้าง token ใหม่ไม่สำเร็จ' }

  revalidatePath(`/contracts/${contractId}`)
  return { sign_token: newToken }
}
