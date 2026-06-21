'use server'

import { getGeminiApiKey } from '@/lib/ai/geminiKey'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { checkAiQuota, incrementAiUsage } from '@/lib/aiQuota'
import { geminiParseDocument, geminiParseBankBook } from '@/lib/ocr'
import type { OcrDocumentResult, BankBookOcrResult } from '@/lib/ocr'
import { logActivity } from '@/lib/activity/log'

// ─── Types ───────────────────────────────────────────────────

export type OwnerInput = {
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
  address_no?: string
  moo?: string
  address_road?: string
  province?: string
  district?: string
  subdistrict?: string
  zip?: string
  bank_name?: string
  bank_account_no?: string
  bank_account_name?: string
  bank_book_url?: string
  signature_url?: string
  notes?: string
}

// ─── ID Generator ────────────────────────────────────────────

async function nextOwnerId(): Promise<string> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('owners')
    .select('id')
    .like('id', 'OWN-%')
    .order('id', { ascending: false })
    .limit(1)
    .maybeSingle()

  const num = data?.id ? (parseInt(data.id.slice(4)) || 0) : 0
  return `OWN-${String(num + 1).padStart(4, '0')}`
}

// ─── Create ──────────────────────────────────────────────────

export async function createOwner(
  input: OwnerInput
): Promise<{ error?: string; id?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'ไม่ได้รับอนุญาต' }

  const id = await nextOwnerId()

  const { error } = await supabase.from('owners').insert({
    id,
    agent_uid: user.id,
    ...input,
  })

  if (error) return { error: 'บันทึกไม่สำเร็จ: ' + error.message }

  await logActivity({
    userId: user.id,
    entityType: 'owner',
    entityId: id,
    action: 'created',
    title: `เพิ่มเจ้าของทรัพย์ ${id}`,
    description: [input.first_name_th, input.last_name_th].filter(Boolean).join(' ') || undefined,
  })

  revalidatePath('/owners')
  return { id }
}

// ─── Update ──────────────────────────────────────────────────

export async function updateOwner(
  ownerId: string,
  input: OwnerInput
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'ไม่ได้รับอนุญาต' }

  const { error } = await supabase
    .from('owners')
    .update(input)
    .eq('id', ownerId)
    .eq('agent_uid', user.id)

  if (error) return { error: 'บันทึกไม่สำเร็จ: ' + error.message }

  await logActivity({
    userId: user.id,
    entityType: 'owner',
    entityId: ownerId,
    action: 'updated',
    title: `แก้ไขข้อมูลเจ้าของ ${ownerId}`,
  })

  revalidatePath('/owners')
  revalidatePath(`/owners/${ownerId}`)
  return {}
}

export async function getOwnerById(
  ownerId: string
): Promise<{ data?: import('@/types').Owner; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'ไม่ได้รับอนุญาต' }

  const { data, error } = await supabase
    .from('owners')
    .select('*')
    .eq('id', ownerId)
    .eq('agent_uid', user.id)
    .single()

  if (error) return { error: error.message }
  return { data: data as import('@/types').Owner }
}

// ─── Archive / Restore ───────────────────────────────────────

export async function archiveOwner(ownerId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'ไม่ได้รับอนุญาต' }

  const { data: active } = await supabase
    .from('contracts')
    .select('id')
    .eq('owner_id', ownerId)
    .eq('agent_uid', user.id)
    .not('status', 'in', '("cancelled","completed","terminated")')
    .limit(1)

  if (active && active.length > 0)
    return { error: 'ไม่สามารถเก็บถาวรได้ เนื่องจากยังมีสัญญาที่ยังไม่สิ้นสุด' }

  const { error } = await supabase
    .from('owners')
    .update({ is_archived: true, archived_at: new Date().toISOString(), archived_by: user.id })
    .eq('id', ownerId)
    .eq('agent_uid', user.id)

  if (error) return { error: 'เก็บถาวรไม่สำเร็จ: ' + error.message }

  revalidatePath('/owners')
  revalidatePath(`/owners/${ownerId}`)
  return {}
}

export async function restoreOwner(ownerId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'ไม่ได้รับอนุญาต' }

  const { error } = await supabase
    .from('owners')
    .update({ is_archived: false, archived_at: null, archived_by: null })
    .eq('id', ownerId)
    .eq('agent_uid', user.id)

  if (error) return { error: 'กู้คืนไม่สำเร็จ: ' + error.message }

  revalidatePath('/owners')
  revalidatePath(`/owners/${ownerId}`)
  return {}
}

// ─── OCR Document (ID card or Passport) ──────────────────────

export async function parseDocument(
  base64: string,
  mimeType: string
): Promise<OcrDocumentResult | { error: string }> {
  const apiKey = getGeminiApiKey()
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

// ─── OCR Bank Book ────────────────────────────────────────────

export async function parseBankBook(
  base64: string,
  mimeType: string
): Promise<BankBookOcrResult | { error: string }> {
  const apiKey = getGeminiApiKey()
  if (!apiKey) return { error: 'ไม่พบ Gemini API key' }

  const { allowed, error: quotaErr } = await checkAiQuota()
  if (!allowed) return { error: quotaErr ?? 'เกินโควต้า AI' }

  try {
    const result = await geminiParseBankBook(base64, mimeType, apiKey)
    await incrementAiUsage()
    return result
  } catch (err) {
    console.error('Bank book OCR error:', err)
    return { error: 'อ่านสมุดบัญชีไม่สำเร็จ กรุณาลองใหม่' }
  }
}
