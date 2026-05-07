'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

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
  follow_up?: boolean
  address_no?: string
  address_road?: string
  province?: string
  district?: string
  subdistrict?: string
  zip?: string
  bank_name?: string
  bank_account_no?: string
  bank_account_name?: string
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

// ─── OCR ID Card (reuse same logic as owners) ────────────────

export type OcrResult = {
  prefix?: string | null
  first_name_th?: string | null
  last_name_th?: string | null
  national_id?: string | null
  address_no?: string | null
  address_road?: string | null
  province?: string | null
  district?: string | null
  subdistrict?: string | null
  zip?: string | null
}

export async function parseIdCard(
  base64: string,
  mimeType: string
): Promise<OcrResult | { error: string }> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return { error: 'ไม่พบ Gemini API key' }

  const prompt = `วิเคราะห์ภาพบัตรประชาชนไทยนี้และส่งคืน JSON เท่านั้น ไม่ต้องมีคำอธิบาย:

{
  "prefix": "คำนำหน้า เช่น นาย/นาง/นางสาว หรือ null",
  "first_name_th": "ชื่อภาษาไทย หรือ null",
  "last_name_th": "นามสกุลภาษาไทย หรือ null",
  "national_id": "เลขบัตรประชาชน 13 หลัก (ตัวเลขล้วน ไม่มีเครื่องหมาย) หรือ null",
  "address_no": "บ้านเลขที่ หรือ null",
  "address_road": "ถนน/ซอย หรือ null",
  "province": "จังหวัด หรือ null",
  "district": "อำเภอ/เขต หรือ null",
  "subdistrict": "ตำบล/แขวง หรือ null",
  "zip": "รหัสไปรษณีย์ หรือ null"
}`

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { inlineData: { mimeType, data: base64 } },
              { text: prompt },
            ],
          }],
          generationConfig: {
            temperature: 0.1,
            responseMimeType: 'application/json',
          },
        }),
      }
    )

    if (!res.ok) return { error: `Gemini API error ${res.status}` }

    const data = await res.json()
    const text: string = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    return JSON.parse(cleaned || '{}') as OcrResult
  } catch (err) {
    console.error('OCR error:', err)
    return { error: 'อ่านบัตรประชาชนไม่สำเร็จ กรุณาลองใหม่' }
  }
}
