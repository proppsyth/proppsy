'use server'

import { createServiceClient, createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { createHash } from 'crypto'
import type { SignerRole, ContractSigner } from '@/types'
import { handleAllSignedIfComplete } from '@/lib/contracts/signingEngine'
import { logActivity } from '@/lib/activity/log'
import { sendEmail, buildSignedEmail, siteUrl } from '@/lib/email'

const SIGNER_ROLE_TH: Record<string, string> = {
  tenant: 'ผู้เช่า',
  owner: 'เจ้าของ',
  co_agent: 'Co-Agent',
  witness: 'พยาน',
}

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

  await logActivity({
    entityType: 'esign',
    entityId: signer.contract_id,
    action: 'opened',
    title: `เปิดลิงก์ลงนาม ${signer.contract_id}`,
    metadata: { signer_id: signer.id },
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

  // Fetch contract for profile auto-save + consent log + notifications
  const { data: contract } = await supabase
    .from('contracts')
    .select('id, doc_type, owner_id, customer_id, agent_uid, stock:stock(project_name, unit_no)')
    .eq('id', signer.contract_id)
    .single()

  // Auto-save signature to owner/customer profile
  if (signatureUrl && signer.signer_role && contract) {
    if (signer.signer_role === 'owner' && contract.owner_id) {
      await supabase.from('owners').update({ signature_url: signatureUrl }).eq('id', contract.owner_id)
    } else if (signer.signer_role === 'tenant' && contract.customer_id) {
      await supabase.from('customers').update({ signature_url: signatureUrl }).eq('id', contract.customer_id)
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

  await logActivity({
    entityType: 'esign',
    entityId: signer.contract_id,
    action: 'signed',
    title: `${signerName || 'ผู้ลงนาม'} ลงนามสัญญา ${signer.contract_id}`,
    metadata: { signer_id: signer.id, signer_role: signer.signer_role },
  })

  // E-Sign Consent Log — wrapped in try/catch so it never blocks signing
  try {
    const headersList = await headers()
    const ipRaw = headersList.get('x-forwarded-for') ?? headersList.get('x-real-ip') ?? null
    const ipAddress = ipRaw ? (ipRaw.split(',')[0]?.trim() ?? null) : null
    const hashInput = [token, signerName, now, signer.contract_id].join('|')
    const signatureHash = createHash('sha256').update(hashInput).digest('hex')
    await supabase.from('esign_consent_logs').insert({
      contract_id: signer.contract_id,
      document_id: signer.contract_id,
      document_type: contract?.doc_type ?? null,
      document_no: signer.contract_id,
      signer_role: signer.signer_role ?? null,
      signer_name: signerName || null,
      signed_at: now,
      ip_address: ipAddress,
      user_agent: userAgent || null,
      signature_hash: signatureHash,
      consent_text_version: 'v1',
    })
  } catch {
    // Log failure must never block the signing flow
  }

  // Email notification to the agent — best-effort, non-blocking
  try {
    const agentUid = (contract as { agent_uid?: string } | null)?.agent_uid
    if (agentUid) {
      // All signed if no remaining signer is still pending/viewed
      const { count: remaining } = await supabase
        .from('contract_signers')
        .select('id', { count: 'exact', head: true })
        .eq('contract_id', signer.contract_id)
        .neq('status', 'signed')
      const allSigned = (remaining ?? 0) === 0

      const { data: agentUser } = await supabase.auth.admin.getUserById(agentUid)
      const agentEmail = agentUser?.user?.email
      if (agentEmail) {
        const stock = (contract as { stock?: { project_name?: string | null; unit_no?: string | null } | null }).stock
        const propertyLabel = [stock?.project_name, stock?.unit_no].filter(Boolean).join(' · ') || undefined
        const { subject, html } = buildSignedEmail({
          contractId: signer.contract_id,
          signerName: signerName || undefined,
          signerRoleLabel: signer.signer_role ? SIGNER_ROLE_TH[signer.signer_role] : undefined,
          propertyLabel,
          allSigned,
          contractUrl: `${siteUrl()}/contracts/${signer.contract_id}`,
        })
        await sendEmail({ to: agentEmail, subject, html })
      }
    }
  } catch (err) {
    console.error('signed email error:', err)
  }

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
