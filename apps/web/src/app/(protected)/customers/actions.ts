'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { checkAiQuota, incrementAiUsage } from '@/lib/aiQuota'
import { geminiParseDocument } from '@/lib/ocr'
import type { OcrDocumentResult } from '@/lib/ocr'

// ─── Types ───────────────────────────────────────────────────

export type CustomerInput = {
  prefix?: string
  prefix_en?: string
  first_name_th?: string
  last_name_th?: string
  first_name_en?: string
  last_name_en?: string
  nickname?: string
  phone?: string
  line_id?: string
  national_id?: string
  id_card_url?: string
  source?: string
  lead_status?: string
  follow_up?: boolean
  address_no?: string
  moo?: string
  address_road?: string
  province?: string
  district?: string
  subdistrict?: string
  zip?: string
  signature_url?: string
  notes?: string
}

// ─── ID Generator ────────────────────────────────────────────

async function nextCustomerId(): Promise<string> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('customers')
    .select('id')
    .like('id', 'CUS-%')
    .order('id', { ascending: false })
    .limit(1)
    .maybeSingle()

  const num = data?.id ? (parseInt(data.id.slice(4)) || 0) : 0
  return `CUS-${String(num + 1).padStart(4, '0')}`
}

// ─── Create ──────────────────────────────────────────────────

export async function createCustomer(
  input: CustomerInput
): Promise<{ error?: string; id?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'ไม่ได้รับอนุญาต' }

  const id = await nextCustomerId()

  const { error } = await supabase.from('customers').insert({
    id,
    agent_uid: user.id,
    follow_up: input.follow_up ?? false,
    ...input,
  })

  if (error) return { error: 'บันทึกไม่สำเร็จ: ' + error.message }

  revalidatePath('/customers')
  return { id }
}

// ─── Update ──────────────────────────────────────────────────

export async function updateCustomer(
  customerId: string,
  input: CustomerInput
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'ไม่ได้รับอนุญาต' }

  const { error } = await supabase
    .from('customers')
    .update(input)
    .eq('id', customerId)
    .eq('agent_uid', user.id)

  if (error) return { error: 'บันทึกไม่สำเร็จ: ' + error.message }

  revalidatePath('/customers')
  revalidatePath(`/customers/${customerId}`)
  return {}
}

// ─── Archive / Restore ───────────────────────────────────────

export async function archiveCustomer(customerId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'ไม่ได้รับอนุญาต' }

  const { data: active } = await supabase
    .from('contracts')
    .select('id')
    .eq('customer_id', customerId)
    .eq('agent_uid', user.id)
    .not('status', 'in', '("cancelled","completed","terminated")')
    .limit(1)

  if (active && active.length > 0)
    return { error: 'ไม่สามารถเก็บถาวรได้ เนื่องจากยังมีสัญญาที่ยังไม่สิ้นสุด' }

  const { error } = await supabase
    .from('customers')
    .update({ is_archived: true, archived_at: new Date().toISOString(), archived_by: user.id })
    .eq('id', customerId)
    .eq('agent_uid', user.id)

  if (error) return { error: 'เก็บถาวรไม่สำเร็จ: ' + error.message }

  revalidatePath('/customers')
  revalidatePath(`/customers/${customerId}`)
  return {}
}

export async function restoreCustomer(customerId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'ไม่ได้รับอนุญาต' }

  const { error } = await supabase
    .from('customers')
    .update({ is_archived: false, archived_at: null, archived_by: null })
    .eq('id', customerId)
    .eq('agent_uid', user.id)

  if (error) return { error: 'กู้คืนไม่สำเร็จ: ' + error.message }

  revalidatePath('/customers')
  revalidatePath(`/customers/${customerId}`)
  return {}
}

// ─── OCR Document (ID card or Passport) ──────────────────────

export async function parseDocument(
  base64: string,
  mimeType: string
): Promise<OcrDocumentResult | { error: string }> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return { error: 'ไม่พบ Gemini API key' }

  const { allowed, error: quotaErr } = await checkAiQuota()
  if (!allowed) return { error: quotaErr ?? 'เกินโควต้า AI' }

  try {
    const result = await geminiParseDocument(base64, mimeType, apiKey)
    await incrementAiUsage()
    return result
  } catch (err) {
    console.error('OCR error:', err)
    return { error: 'อ่านเอกสารไม่สำเร็จ กรุณาลองใหม่' }
  }
}
