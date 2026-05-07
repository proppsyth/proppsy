'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// ─── Types ───────────────────────────────────────────────────

export type StockInput = {
  project_name?: string
  project_id?: string | null
  owner_id?: string | null
  unit_no?: string
  unit_name?: string
  building?: string
  floor?: number
  room_type?: string
  size_sqm?: number
  view_direction?: string
  listing_type: string
  rent_price?: number
  sale_price?: number
  deposit: number
  contract_term: number
  furniture: string[]
  facilities: string[]
  status: string
  photo_urls: string[]
  notes?: string
  contract_end_date?: string
}

export type AiParseResult = {
  project_name?: string | null
  unit_no?: string | null
  building?: string | null
  floor?: number | null
  room_type?: string | null
  size_sqm?: number | null
  view_direction?: string | null
  listing_type?: string | null
  rent_price?: number | null
  sale_price?: number | null
  deposit?: number | null
  contract_term?: number | null
  furniture?: string[]
  facilities?: string[]
  notes?: string | null
}

// ─── ID Generator ────────────────────────────────────────────

async function nextStockId(): Promise<string> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('stock')
    .select('id')
    .like('id', 'STK-%')
    .order('id', { ascending: false })
    .limit(1)
    .maybeSingle()

  const num = data?.id ? (parseInt(data.id.slice(4)) || 0) : 0
  return `STK-${String(num + 1).padStart(4, '0')}`
}

// ─── Create ──────────────────────────────────────────────────

export async function createStock(
  input: StockInput
): Promise<{ error?: string; id?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'ไม่ได้รับอนุญาต' }

  const id = await nextStockId()

  const { error } = await supabase.from('stock').insert({
    id,
    agent_uid: user.id,
    ...input,
    project_id: input.project_id || null,
    owner_id: input.owner_id || null,
  })

  if (error) return { error: 'บันทึกไม่สำเร็จ: ' + error.message }

  revalidatePath('/stock')
  return { id }
}

// ─── Update ──────────────────────────────────────────────────

export async function updateStock(
  stockId: string,
  input: StockInput
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'ไม่ได้รับอนุญาต' }

  const { error } = await supabase
    .from('stock')
    .update({
      ...input,
      project_id: input.project_id || null,
      owner_id: input.owner_id || null,
    })
    .eq('id', stockId)
    .eq('agent_uid', user.id)

  if (error) return { error: 'บันทึกไม่สำเร็จ: ' + error.message }

  revalidatePath('/stock')
  revalidatePath(`/stock/${stockId}`)
  return {}
}

// ─── AI Parse ────────────────────────────────────────────────

export async function parseStockText(
  rawText: string
): Promise<AiParseResult | { error: string }> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return { error: 'ไม่พบ Gemini API key' }

  const prompt = `คุณเป็นผู้ช่วย AI ด้านอสังหาริมทรัพย์ไทย
วิเคราะห์ข้อความลิสติ้งนี้และส่งคืน JSON ตามโครงสร้างต่อไปนี้เท่านั้น ไม่ต้องมีคำอธิบาย:

{
  "project_name": "ชื่อโครงการ หรือ null",
  "unit_no": "เลขห้อง/ยูนิต หรือ null",
  "building": "อาคาร/ตึก หรือ null",
  "floor": ตัวเลขชั้น หรือ null,
  "room_type": "Studio|1BR|2BR|3BR|Penthouse|อื่นๆ หรือ null",
  "size_sqm": ตัวเลขตร.ม. หรือ null,
  "view_direction": "ทิศหน้าห้อง หรือ null",
  "listing_type": "rent|sale|both หรือ null",
  "rent_price": ตัวเลขค่าเช่าต่อเดือน หรือ null,
  "sale_price": ตัวเลขราคาขาย หรือ null,
  "deposit": จำนวนเดือนมัดจำ (ตัวเลขเดือน ไม่ใช่จำนวนเงิน) หรือ null,
  "contract_term": จำนวนเดือนสัญญา หรือ null,
  "furniture": ["เฟอร์นิเจอร์1", "เฟอร์นิเจอร์2"],
  "facilities": ["สิ่งอำนวยความสะดวก1", "สิ่งอำนวยความสะดวก2"],
  "notes": "หมายเหตุ หรือ null"
}

ข้อความ:
${rawText.slice(0, 4000)}`

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
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
    return JSON.parse(cleaned || '{}') as AiParseResult
  } catch (err) {
    console.error('Gemini parse error:', err)
    return { error: 'วิเคราะห์ข้อความไม่สำเร็จ กรุณาลองใหม่' }
  }
}
