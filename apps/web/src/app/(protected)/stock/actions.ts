'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { resolvePlan, PLAN_LIMITS } from '@/types'
import { checkAiQuota } from '@/lib/aiQuota'

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

  const [{ data: profile }, { count: stockCount }] = await Promise.all([
    supabase.from('profiles').select('plan').eq('id', user.id).single(),
    supabase.from('stock').select('*', { count: 'exact', head: true }).eq('agent_uid', user.id),
  ])
  const limits = PLAN_LIMITS[resolvePlan(profile?.plan)]
  if (limits.maxStock !== null && (stockCount ?? 0) >= limits.maxStock) {
    return { error: `ถึงขีดจำกัดแพ็กเกจแล้ว (สูงสุด ${limits.maxStock} ทรัพย์)` }
  }

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

// ─── Delete ──────────────────────────────────────────────────

export async function deleteStock(stockId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'ไม่ได้รับอนุญาต' }

  const { error } = await supabase
    .from('stock')
    .delete()
    .eq('id', stockId)
    .eq('agent_uid', user.id)

  if (error) return { error: 'ลบไม่สำเร็จ: ' + error.message }

  revalidatePath('/stock')
  return {}
}

// ─── AI Parse with Entity Creation ──────────────────────────

export type ParseWithEntitiesResult = {
  stock: AiParseResult
  owner_id?: string
  owner_created: boolean
  owner_display?: string
  project_id?: string
  project_created: boolean
  project_display?: string
}

export async function parseStockTextWithEntities(
  rawText: string
): Promise<ParseWithEntitiesResult | { error: string }> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return { error: 'ไม่พบ Gemini API key' }

  {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'ไม่ได้รับอนุญาต' }
    const { data: profile } = await supabase.from('profiles').select('plan').eq('id', user.id).single()
    if (!PLAN_LIMITS[resolvePlan(profile?.plan)].ai) return { error: 'ฟีเจอร์ AI ต้องใช้แพ็กเกจ AI Pro ขึ้นไป' }
  }

  {
    const { allowed, error: quotaErr } = await checkAiQuota()
    if (!allowed) return { error: quotaErr ?? 'เกินโควต้า AI' }
  }

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
  "facilities": ["สิ่งอำนวยความสะดวก1"],
  "notes": "หมายเหตุ หรือ null",
  "owner_name": "ชื่อ-นามสกุล หรือชื่อเล่น ของเจ้าของ/ผู้ฝาก หรือ null",
  "owner_phone": "เบอร์โทรศัพท์ของเจ้าของ หรือ null",
  "owner_line_id": "LINE ID ของเจ้าของ (ไม่มี @) หรือ null"
}

ข้อความ:
${rawText.slice(0, 4000)}`

  let raw: (AiParseResult & { owner_name?: string; owner_phone?: string; owner_line_id?: string }) | null = null

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.1, responseMimeType: 'application/json' },
        }),
      }
    )
    if (!res.ok) return { error: `Gemini API error ${res.status}` }
    const data = await res.json()
    const text: string = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    raw = JSON.parse(cleaned || '{}')
  } catch (err) {
    console.error('Gemini parse error:', err)
    return { error: 'วิเคราะห์ข้อความไม่สำเร็จ กรุณาลองใหม่' }
  }

  if (!raw) return { error: 'วิเคราะห์ข้อความไม่สำเร็จ' }

  const { owner_name, owner_phone, owner_line_id, ...stockData } = raw
  const result: ParseWithEntitiesResult = {
    stock: stockData,
    owner_created: false,
    project_created: false,
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'ไม่ได้รับอนุญาต' }

  // ── Find or create owner ──────────────────────────────────
  if (owner_phone || owner_line_id || owner_name) {
    let existingOwnerId: string | undefined

    if (owner_phone) {
      const { data } = await supabase
        .from('owners')
        .select('id, first_name_th, last_name_th, nickname')
        .eq('agent_uid', user.id)
        .eq('phone', owner_phone)
        .maybeSingle()
      if (data) existingOwnerId = data.id
    }

    if (!existingOwnerId && owner_line_id) {
      const { data } = await supabase
        .from('owners')
        .select('id, first_name_th, last_name_th, nickname')
        .eq('agent_uid', user.id)
        .eq('line_id', owner_line_id)
        .maybeSingle()
      if (data) existingOwnerId = data.id
    }

    if (existingOwnerId) {
      result.owner_id = existingOwnerId
      result.owner_display = owner_name ?? undefined
    } else if (owner_name || owner_phone) {
      const nameParts = (owner_name ?? '').trim().split(/\s+/)
      const firstName = nameParts[0] ?? ''
      const lastName = nameParts.slice(1).join(' ')

      const { data: { id: newOwnerId } } = await (async () => {
        const { data: existingIds } = await supabase
          .from('owners').select('id').like('id', 'OWN-%').order('id', { ascending: false }).limit(1)
        const num = existingIds?.[0]?.id ? (parseInt(existingIds[0].id.slice(4)) || 0) : 0
        const id = `OWN-${String(num + 1).padStart(4, '0')}`
        await supabase.from('owners').insert({
          id, agent_uid: user.id,
          first_name_th: firstName || null,
          last_name_th: lastName || null,
          phone: owner_phone ?? null,
          line_id: owner_line_id ?? null,
        })
        return { data: { id } }
      })()

      result.owner_id = newOwnerId
      result.owner_created = true
      result.owner_display = owner_name ?? owner_phone ?? undefined
      revalidatePath('/owners')
    }
  }

  // ── Find or create project ────────────────────────────────
  const projectName = stockData.project_name
  if (projectName) {
    const { data: existing } = await supabase
      .from('projects')
      .select('id, name_th')
      .ilike('name_th', `%${projectName}%`)
      .limit(1)
      .maybeSingle()

    if (existing) {
      result.project_id = existing.id
      result.project_display = existing.name_th
    } else {
      // Enrich via AI then create
      try {
        const enrichRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: `คุณเป็นผู้เชี่ยวชาญด้านอสังหาริมทรัพย์ไทย วิเคราะห์โครงการ "${projectName}" และส่งคืน JSON เท่านั้น:\n{"name_en":null,"developer":null,"built_year":null,"total_floors":null,"total_units":null,"facilities":[],"bts_mrt":[],"address_road":null,"province":null,"district":null,"subdistrict":null,"zip":null}\nหากไม่แน่ใจให้ใส่ null` }] }],
              generationConfig: { temperature: 0.1, responseMimeType: 'application/json' },
            }),
          }
        )
        const enrichData = enrichRes.ok ? await enrichRes.json() : null
        const enrichText: string = enrichData?.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
        const enrichCleaned = enrichText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
        const enrich = JSON.parse(enrichCleaned || '{}')

        const { data: pIds } = await supabase
          .from('projects').select('id').like('id', 'PRJ-%').order('id', { ascending: false }).limit(1)
        const pNum = pIds?.[0]?.id ? (parseInt(pIds[0].id.slice(4)) || 0) : 0
        const pId = `PRJ-${String(pNum + 1).padStart(4, '0')}`

        await supabase.from('projects').insert({
          id: pId,
          created_by: user.id,
          name_th: projectName,
          name_en: enrich.name_en ?? null,
          developer: enrich.developer ?? null,
          built_year: enrich.built_year ?? null,
          total_floors: enrich.total_floors ?? null,
          total_units: enrich.total_units ?? null,
          facilities: enrich.facilities ?? [],
          bts_mrt: enrich.bts_mrt ?? [],
          address_road: enrich.address_road ?? null,
          province: enrich.province ?? null,
          district: enrich.district ?? null,
          subdistrict: enrich.subdistrict ?? null,
          zip: enrich.zip ?? null,
        })
        result.project_id = pId
        result.project_created = true
        result.project_display = projectName
        revalidatePath('/projects')
      } catch {
        // project creation failed — not critical
      }
    }
  }

  return result
}

// ─── AI Parse (simple, no entity creation) ───────────────────

export async function parseStockText(
  rawText: string
): Promise<AiParseResult | { error: string }> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return { error: 'ไม่พบ Gemini API key' }

  {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'ไม่ได้รับอนุญาต' }
    const { data: profile } = await supabase.from('profiles').select('plan').eq('id', user.id).single()
    if (!PLAN_LIMITS[resolvePlan(profile?.plan)].ai) return { error: 'ฟีเจอร์ AI ต้องใช้แพ็กเกจ AI Pro ขึ้นไป' }
  }

  {
    const { allowed, error: quotaErr } = await checkAiQuota()
    if (!allowed) return { error: quotaErr ?? 'เกินโควต้า AI' }
  }

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
