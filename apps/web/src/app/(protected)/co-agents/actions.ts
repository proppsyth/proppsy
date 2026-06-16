'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { checkAiQuota, incrementAiUsage } from '@/lib/aiQuota'
import { geminiParseDocument, geminiParseBankBook, type OcrDocumentResult, type BankBookOcrResult } from '@/lib/ocr'

export interface CoAgentInput {
  prefix_th?: string
  prefix_en?: string
  first_name_th: string
  last_name_th: string
  first_name_en?: string
  last_name_en?: string
  address_no?: string
  moo?: string
  soi?: string
  road?: string
  subdistrict?: string
  district?: string
  province?: string
  zip?: string
  bank_name?: string
  bank_account_name?: string
  bank_account_no?: string
  national_id?: string
  tax_id?: string
  id_card_url?: string
  bank_book_url?: string
  signature_url?: string
}

export async function createCoAgent(input: CoAgentInput): Promise<{ error?: string; id?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'ไม่ได้เข้าสู่ระบบ' }

    const { data, error } = await supabase
      .from('co_agents')
      .insert({ ...input, agent_uid: user.id })
      .select('id')
      .single()

    if (error) return { error: error.message }
    revalidatePath('/co-agents')
    return { id: data.id }
  } catch {
    return { error: 'เกิดข้อผิดพลาด' }
  }
}

export async function updateCoAgent(id: string, input: CoAgentInput): Promise<{ error?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'ไม่ได้เข้าสู่ระบบ' }

    const { error } = await supabase
      .from('co_agents')
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('agent_uid', user.id)

    if (error) return { error: error.message }
    revalidatePath('/co-agents')
    return {}
  } catch {
    return { error: 'เกิดข้อผิดพลาด' }
  }
}

export async function deleteCoAgent(id: string): Promise<{ error?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'ไม่ได้เข้าสู่ระบบ' }

    const { error } = await supabase
      .from('co_agents')
      .delete()
      .eq('id', id)
      .eq('agent_uid', user.id)

    if (error) return { error: error.message }
    revalidatePath('/co-agents')
    return {}
  } catch {
    return { error: 'เกิดข้อผิดพลาด' }
  }
}

// ─── OCR ─────────────────────────────────────────────────────

export async function parseCoAgentIdCard(
  base64: string,
  mimeType: string
): Promise<{ error: string } | OcrDocumentResult> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return { error: 'ไม่พบ Gemini API key' }

  const { allowed, error: quotaErr } = await checkAiQuota()
  if (!allowed) return { error: quotaErr ?? 'เกินโควต้า AI' }

  try {
    const result = await geminiParseDocument(base64, mimeType, apiKey)
    await incrementAiUsage()
    return result
  } catch {
    return { error: 'ไม่สามารถอ่านเอกสารได้' }
  }
}

export async function parseCoAgentBankBook(
  base64: string,
  mimeType: string
): Promise<{ error: string } | BankBookOcrResult> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return { error: 'ไม่พบ Gemini API key' }

  const { allowed, error: quotaErr } = await checkAiQuota()
  if (!allowed) return { error: quotaErr ?? 'เกินโควต้า AI' }

  try {
    const result = await geminiParseBankBook(base64, mimeType, apiKey)
    await incrementAiUsage()
    return result
  } catch {
    return { error: 'ไม่สามารถอ่านสมุดบัญชีได้' }
  }
}
