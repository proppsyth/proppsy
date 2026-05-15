'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { checkAiQuota, incrementAiUsage } from '@/lib/aiQuota'
import { geminiParseDocument, geminiParseBankBook } from '@/lib/ocr'
import type { OcrDocumentResult, BankBookOcrResult } from '@/lib/ocr'

export type { OcrDocumentResult, BankBookOcrResult }

export async function updateProfile(
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'ไม่ได้รับอนุญาต' }

  const str = (key: string) => (formData.get(key) as string)?.trim() || null

  const { error } = await supabase
    .from('profiles')
    .update({
      // Identity
      prefix: str('prefix'),
      prefix_en: str('prefix_en'),
      first_name_th: str('first_name_th'),
      last_name_th: str('last_name_th'),
      first_name_en: str('first_name_en'),
      last_name_en: str('last_name_en'),
      national_id: str('national_id'),
      nationality: str('nationality'),
      gender: str('gender'),
      birth_date: str('birth_date'),
      // Personal
      name: str('name'),
      nickname: str('nickname'),
      phone: str('phone'),
      line_id: str('line_id'),
      position: str('position'),
      company_name: str('company_name'),
      tax_id: str('tax_id'),
      // Address
      address_no: str('address_no'),
      address_road: str('address_road'),
      subdistrict: str('subdistrict'),
      district: str('district'),
      province: str('province'),
      zip: str('zip'),
      // Bank
      bank_name: str('bank_name'),
      bank_account_no: str('bank_account_no'),
      bank_account_name: str('bank_account_name'),
    })
    .eq('id', user.id)

  if (error) return { error: 'บันทึกไม่สำเร็จ กรุณาลองใหม่' }

  revalidatePath('/profile')
  return { success: true }
}

export async function updateSignatureUrl(
  url: string | null
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'ไม่ได้รับอนุญาต' }

  const { error } = await supabase
    .from('profiles')
    .update({ signature_url: url || null })
    .eq('id', user.id)

  if (error) return { error: error.message }
  revalidatePath('/profile')
  return {}
}

export async function updateIdCardUrl(
  url: string | null
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'ไม่ได้รับอนุญาต' }

  const { error } = await supabase
    .from('profiles')
    .update({ id_card_url: url || null })
    .eq('id', user.id)

  if (error) return { error: error.message }
  revalidatePath('/profile')
  return {}
}

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
    console.error('Profile OCR error:', err)
    return { error: 'อ่านเอกสารไม่สำเร็จ กรุณาลองใหม่' }
  }
}

export async function parseBankBook(
  base64: string,
  mimeType: string
): Promise<BankBookOcrResult | { error: string }> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return { error: 'ไม่พบ Gemini API key' }

  const { allowed, error: quotaErr } = await checkAiQuota()
  if (!allowed) return { error: quotaErr ?? 'เกินโควต้า AI' }

  try {
    const result = await geminiParseBankBook(base64, mimeType, apiKey)
    await incrementAiUsage()
    return result
  } catch (err) {
    console.error('Profile bank OCR error:', err)
    return { error: 'อ่านสมุดบัญชีไม่สำเร็จ กรุณาลองใหม่' }
  }
}
