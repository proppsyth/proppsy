'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { normalizeAddressFields } from '@/lib/address'

// ─── Types ───────────────────────────────────────────────────

export type ProjectInput = {
  name_th: string
  name_en?: string
  developer?: string
  built_year?: number
  total_floors?: number
  total_units?: number
  parking_pct?: number
  facilities: string[]
  bts_mrt: string[]
  address_no?: string
  moo?: string
  address_road?: string
  province?: string
  district?: string
  subdistrict?: string
  zip?: string
  map_url?: string
}

export type AiEnrichResult = {
  name_en?: string | null
  developer?: string | null
  built_year?: number | null
  total_floors?: number | null
  total_units?: number | null
  parking_pct?: number | null
  facilities?: string[]
  bts_mrt?: string[]
  address_road?: string | null
  moo?: string | null
  province?: string | null
  district?: string | null
  subdistrict?: string | null
  zip?: string | null
}

// ─── ID Generator ────────────────────────────────────────────

async function nextProjectId(): Promise<string> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('projects')
    .select('id')
    .like('id', 'PRJ-%')
    .order('id', { ascending: false })
    .limit(1)
    .maybeSingle()

  const num = data?.id ? (parseInt(data.id.slice(4)) || 0) : 0
  return `PRJ-${String(num + 1).padStart(4, '0')}`
}

// ─── Create ──────────────────────────────────────────────────

export async function createProject(
  input: ProjectInput
): Promise<{ error?: string; id?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'ไม่ได้รับอนุญาต' }

  const id = await nextProjectId()

  const { error } = await supabase.from('projects').insert({
    id,
    created_by: user.id,
    ...input,
  })

  if (error) return { error: 'บันทึกไม่สำเร็จ: ' + error.message }

  revalidatePath('/projects')
  return { id }
}

// ─── Update ──────────────────────────────────────────────────

export async function updateProject(
  projectId: string,
  input: ProjectInput
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'ไม่ได้รับอนุญาต' }

  const { error } = await supabase
    .from('projects')
    .update(input)
    .eq('id', projectId)

  if (error) return { error: 'บันทึกไม่สำเร็จ: ' + error.message }

  revalidatePath('/projects')
  revalidatePath(`/projects/${projectId}`)
  return {}
}

// ─── AI Enricher ─────────────────────────────────────────────

export async function enrichProject(
  projectName: string
): Promise<AiEnrichResult | { error: string }> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return { error: 'ไม่พบ Gemini API key' }

  const prompt = `คุณเป็นผู้เชี่ยวชาญด้านอสังหาริมทรัพย์ไทย
วิเคราะห์โครงการคอนโดมิเนียมชื่อ "${projectName}" และส่งคืน JSON เท่านั้น ไม่ต้องมีคำอธิบาย:

{
  "name_en": "ชื่อโครงการภาษาอังกฤษ หรือ null",
  "developer": "ชื่อบริษัทผู้พัฒนา หรือ null",
  "built_year": ปีที่สร้างเสร็จ (ค.ศ.) หรือ null,
  "total_floors": จำนวนชั้นทั้งหมด หรือ null,
  "total_units": จำนวนยูนิตทั้งหมด หรือ null,
  "parking_pct": เปอร์เซ็นต์ที่จอดรถ (0-100) หรือ null,
  "facilities": ["สิ่งอำนวยความสะดวก1", "สิ่งอำนวยความสะดวก2"],
  "bts_mrt": ["BTS/MRT ที่ใกล้ที่สุด"],
  "address_road": "ถนนหลัก หรือ null",
  "moo": "หมู่บ้าน/ชุมชน (ข้อความ) หรือ null",
  "province": "จังหวัด (ภาษาไทย) หรือ null",
  "district": "เขต/อำเภอ (ภาษาไทย) หรือ null",
  "subdistrict": "แขวง/ตำบล (ภาษาไทย) หรือ null",
  "zip": "รหัสไปรษณีย์ หรือ null"
}

หากไม่มีข้อมูลที่แน่ชัด ให้ใส่ null ไม่ต้องเดา`

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
    const raw = JSON.parse(cleaned || '{}') as AiEnrichResult

    // Validate province/district/subdistrict against CSV — discard hallucinations
    const normalized = normalizeAddressFields({
      province: raw.province ?? undefined,
      district: raw.district ?? undefined,
      subdistrict: raw.subdistrict ?? undefined,
    })

    if (normalized) {
      raw.province = normalized.province_th
      raw.district = normalized.district_th
      raw.subdistrict = normalized.subdistrict_th
      raw.zip = normalized.zip
    } else {
      raw.province = null
      raw.district = null
      raw.subdistrict = null
      raw.zip = null
    }

    return raw
  } catch (err) {
    console.error('Enricher error:', err)
    return { error: 'ค้นหาข้อมูลโครงการไม่สำเร็จ กรุณาลองใหม่' }
  }
}

// ─── Smart Project Search (Feature 5) ────────────────────────

export type ProjectSearchResult = {
  id: string
  name_th: string
  name_en: string | null
}

export async function searchProjects(
  query: string
): Promise<ProjectSearchResult[]> {
  if (!query.trim()) return []

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const q = query.trim()

  // Search name_th OR name_en with ilike, sort by name_en NULLS LAST then name_th
  const { data } = await supabase
    .from('projects')
    .select('id, name_th, name_en')
    .or(`name_th.ilike.%${q}%,name_en.ilike.%${q}%`)
    .order('name_en', { ascending: true, nullsFirst: false })
    .order('name_th', { ascending: true })
    .limit(20)

  return (data ?? []) as ProjectSearchResult[]
}
