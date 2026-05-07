'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { ContractDocType } from '@/types'

// ─── Types ───────────────────────────────────────────────────

export type ContractInput = {
  doc_type: ContractDocType
  stock_id?: string | null
  owner_id?: string | null
  customer_id?: string | null
  rent_price?: number | null
  deposit_months?: number | null
  deposit_amount?: number | null
  contract_months?: number | null
  move_in_date?: string | null
  end_date?: string | null
  cleaning_fee?: number | null
  ac_count?: number | null
  ac_wash_per_unit?: number | null
  penalty_amount?: number | null
  commission_net?: number | null
  vat_7: boolean
  wht_3: boolean
}

// ─── ID Generator ────────────────────────────────────────────

async function nextContractId(): Promise<string> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('contracts')
    .select('id')
    .like('id', 'BK-%')
    .order('id', { ascending: false })
    .limit(1)
    .maybeSingle()

  const num = data?.id ? (parseInt(data.id.slice(3)) || 0) : 0
  return `BK-${String(num + 1).padStart(4, '0')}`
}

// ─── Create ──────────────────────────────────────────────────

export async function createContract(
  input: ContractInput
): Promise<{ error?: string; id?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'ไม่ได้รับอนุญาต' }

  const id = await nextContractId()

  const { error } = await supabase.from('contracts').insert({
    id,
    agent_uid: user.id,
    status: 'draft',
    ...input,
    stock_id: input.stock_id || null,
    owner_id: input.owner_id || null,
    customer_id: input.customer_id || null,
  })

  if (error) return { error: 'บันทึกไม่สำเร็จ: ' + error.message }

  revalidatePath('/contracts')
  return { id }
}

// ─── Update Status ────────────────────────────────────────────

export async function updateContractStatus(
  contractId: string,
  status: 'draft' | 'sent' | 'signed' | 'cancelled'
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'ไม่ได้รับอนุญาต' }

  const { error } = await supabase
    .from('contracts')
    .update({ status })
    .eq('id', contractId)
    .eq('agent_uid', user.id)

  if (error) return { error: 'อัปเดตไม่สำเร็จ: ' + error.message }

  revalidatePath('/contracts')
  revalidatePath(`/contracts/${contractId}`)
  return {}
}

// ─── Generate PDF ────────────────────────────────────────────

export async function generateContractPdf(
  contractId: string
): Promise<{ error?: string; url?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'ไม่ได้รับอนุญาต' }

  // Fetch all needed data
  const [{ data: contract }, { data: profile }] = await Promise.all([
    supabase
      .from('contracts')
      .select('*, stock:stock(*), owner:owners(*), customer:customers(*)')
      .eq('id', contractId)
      .eq('agent_uid', user.id)
      .single(),
    supabase.from('profiles').select('*').eq('id', user.id).single(),
  ])

  if (!contract) return { error: 'ไม่พบสัญญา' }

  try {
    // Dynamic import to avoid bundling in client
    const { renderToBuffer } = await import('@react-pdf/renderer')
    const { ContractDocument } = await import('@/lib/pdf/ContractDocument')
    const { createElement } = await import('react')

    const element = createElement(ContractDocument, {
      contract: {
        id: contract.id,
        doc_type: contract.doc_type,
        created_at: contract.created_at,
        rent_price: contract.rent_price,
        deposit_months: contract.deposit_months,
        deposit_amount: contract.deposit_amount,
        contract_months: contract.contract_months,
        move_in_date: contract.move_in_date,
        end_date: contract.end_date,
        cleaning_fee: contract.cleaning_fee,
        ac_count: contract.ac_count,
        ac_wash_per_unit: contract.ac_wash_per_unit,
        penalty_amount: contract.penalty_amount,
        commission_net: contract.commission_net,
        vat_7: contract.vat_7 ?? false,
        wht_3: contract.wht_3 ?? false,
      },
      stock: contract.stock ?? null,
      owner: contract.owner ?? null,
      customer: contract.customer ?? null,
      agent: {
        name: profile?.name,
        company_name: profile?.company_name,
        phone: profile?.phone,
        logo_url: profile?.logo_url,
        signature_url: profile?.signature_url,
      },
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const buffer = await renderToBuffer(element as any)

    // Upload to Supabase Storage
    const path = `${user.id}/${contractId}.pdf`
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('documents')
      .upload(path, buffer, { contentType: 'application/pdf', upsert: true })

    if (uploadError || !uploadData) {
      return { error: 'อัปโหลด PDF ไม่สำเร็จ: ' + uploadError?.message }
    }

    const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(path)

    // Update contract with pdf_url
    await supabase
      .from('contracts')
      .update({ pdf_url: publicUrl })
      .eq('id', contractId)

    revalidatePath(`/contracts/${contractId}`)
    return { url: publicUrl }
  } catch (err) {
    console.error('PDF generation error:', err)
    return { error: 'สร้าง PDF ไม่สำเร็จ กรุณาลองใหม่' }
  }
}
