/**
 * Canonical project identification + enrichment.
 *
 * A single Gemini call that does two things at once:
 *   1. Identifies the correct project even when the name is misspelled,
 *      English-only, Romanized, or otherwise non-canonical.
 *   2. Enriches the result with developer, floors, facilities, address, etc.
 *
 * The returned `name_th` / `name_en` are the canonical forms that should be
 * stored in the DB.  `confidence` (0–100) signals how certain the model is.
 * Below ~60 the caller should fall back to the raw user input.
 *
 * Designed for long-term reuse across:
 *   - Project manual-create flow  (projects/actions.ts)
 *   - Stock AI-parse flow         (stock/actions.ts)
 *   - Future: bilingual search, duplicate detection, facility lookup
 */

import { normalizeAddressFields } from '@/lib/address'

// ─── Public types ─────────────────────────────────────────────

export interface ProjectIdentityResult {
  /** Canonical Thai project name (corrected from raw input when needed). */
  name_th: string
  /** Canonical English project name, or null if unknown. */
  name_en: string | null
  /**
   * Model confidence that it correctly identified the project (0–100).
   * Use ≥ 70 as threshold for auto-applying canonical names to the form.
   * Use ≥ 60 as threshold for automated flows (stock parser).
   * Below threshold → fall back to the raw user input.
   */
  confidence: number
  /** Other known names: abbreviations, old names, romanised variants. */
  aliases: string[]
  developer: string | null
  built_year: number | null
  total_floors: number | null
  total_units: number | null
  parking_pct: number | null
  facilities: string[]
  bts_mrt: string[]
  address_road: string | null
  moo: string | null
  province: string | null
  district: string | null
  subdistrict: string | null
  zip: string | null
}

// ─── Internal Gemini response shape ──────────────────────────

interface RawGeminiProject {
  name_th?: string | null
  name_en?: string | null
  confidence?: number | null
  aliases?: string[] | null
  developer?: string | null
  built_year?: number | null
  total_floors?: number | null
  total_units?: number | null
  parking_pct?: number | null
  facilities?: string[] | null
  bts_mrt?: string[] | null
  address_road?: string | null
  moo?: string | null
  province?: string | null
  district?: string | null
  subdistrict?: string | null
  zip?: string | null
}

// ─── Prompt ───────────────────────────────────────────────────

function buildPrompt(rawName: string): string {
  return `คุณเป็นผู้เชี่ยวชาญด้านอสังหาริมทรัพย์ไทยที่มีฐานความรู้โครงการคอนโดมิเนียมและอาคารชุดทั่วประเทศไทย

ผู้ใช้ระบุโครงการ: "${rawName}"

ขอให้คุณ:
1. ระบุว่าชื่อนี้ตรงกับโครงการอสังหาริมทรัพย์ใด (แม้ชื่อจะสะกดผิด เป็นภาษาอังกฤษ หรือเป็นชื่อทับศัพท์)
2. แก้ไขชื่อให้เป็นชื่อทางการที่ถูกต้อง
3. รวบรวมข้อมูลโครงการ

ส่งคืน JSON เท่านั้น ไม่ต้องมีคำอธิบาย:

{
  "name_th": "ชื่อทางการภาษาไทยที่ถูกต้อง",
  "name_en": "Official English project name หรือ null",
  "confidence": ตัวเลข 0-100 ความมั่นใจว่าระบุโครงการถูก,
  "aliases": ["ชื่อเรียกอื่น เช่น ชื่อย่อ ชื่อเก่า ชื่อทับศัพท์"],
  "developer": "ชื่อบริษัทผู้พัฒนา หรือ null",
  "built_year": ปีสร้างเสร็จ ค.ศ. หรือ null,
  "total_floors": จำนวนชั้น หรือ null,
  "total_units": จำนวนยูนิต หรือ null,
  "parking_pct": เปอร์เซ็นต์ที่จอดรถ 0-100 หรือ null,
  "facilities": ["สิ่งอำนวยความสะดวก"],
  "bts_mrt": ["BTS/MRT ที่ใกล้ที่สุด"],
  "address_road": "ถนนหลัก หรือ null",
  "moo": "หมู่บ้าน/ชุมชน หรือ null",
  "province": "จังหวัด (ภาษาไทย) หรือ null",
  "district": "เขต/อำเภอ (ภาษาไทย) หรือ null",
  "subdistrict": "แขวง/ตำบล (ภาษาไทย) หรือ null",
  "zip": "รหัสไปรษณีย์ หรือ null"
}

กฎสำคัญ:
- ถ้าชื่อที่ป้อนเป็นภาษาอังกฤษหรือทับศัพท์ → name_th คือชื่อทางการภาษาไทย
- ถ้าชื่อที่ป้อนสะกดผิดเล็กน้อย → name_th คือชื่อที่แก้ไขแล้ว
- confidence = 100 ถ้าแน่ใจมาก, ลดลงตามความไม่แน่นอน, 0 ถ้าไม่รู้จักโครงการนี้เลย
- ถ้าไม่รู้จักโครงการ → name_th = ชื่อที่ผู้ใช้ป้อน, confidence = 0
- ถ้าข้อมูลไม่แน่ชัด ให้ใส่ null ไม่ต้องเดา`
}

// ─── Main export ──────────────────────────────────────────────

/**
 * Call Gemini to identify a project canonically and enrich it.
 * Never throws — on any failure returns a safe result with `confidence = 0`
 * and `name_th = rawName` so the caller can always proceed.
 */
export async function identifyAndEnrichProject(
  rawName: string,
  apiKey: string
): Promise<ProjectIdentityResult> {
  const fallback: ProjectIdentityResult = {
    name_th: rawName,
    name_en: null,
    confidence: 0,
    aliases: [],
    developer: null,
    built_year: null,
    total_floors: null,
    total_units: null,
    parking_pct: null,
    facilities: [],
    bts_mrt: [],
    address_road: null,
    moo: null,
    province: null,
    district: null,
    subdistrict: null,
    zip: null,
  }

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: buildPrompt(rawName) }] }],
          generationConfig: { temperature: 0.1, responseMimeType: 'application/json' },
        }),
      }
    )

    if (!res.ok) return fallback

    const data = await res.json()
    const text: string = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const raw: RawGeminiProject = JSON.parse(cleaned || '{}')

    // Normalise address against authoritative CSV — discard hallucinations
    const normalized = normalizeAddressFields({
      province:    raw.province    ?? undefined,
      district:    raw.district    ?? undefined,
      subdistrict: raw.subdistrict ?? undefined,
    })

    const confidence =
      typeof raw.confidence === 'number'
        ? Math.min(100, Math.max(0, Math.round(raw.confidence)))
        : 0

    return {
      name_th:      (raw.name_th?.trim()) || rawName,
      name_en:      raw.name_en?.trim() || null,
      confidence,
      aliases:      Array.isArray(raw.aliases) ? raw.aliases.filter(Boolean) : [],
      developer:    raw.developer ?? null,
      built_year:   typeof raw.built_year   === 'number' ? raw.built_year   : null,
      total_floors: typeof raw.total_floors === 'number' ? raw.total_floors : null,
      total_units:  typeof raw.total_units  === 'number' ? raw.total_units  : null,
      parking_pct:  typeof raw.parking_pct  === 'number' ? raw.parking_pct  : null,
      facilities:   Array.isArray(raw.facilities) ? raw.facilities.filter(Boolean) : [],
      bts_mrt:      Array.isArray(raw.bts_mrt)    ? raw.bts_mrt.filter(Boolean)    : [],
      address_road: raw.address_road ?? null,
      moo:          raw.moo          ?? null,
      province:     normalized?.province_th    ?? null,
      district:     normalized?.district_th    ?? null,
      subdistrict:  normalized?.subdistrict_th ?? null,
      zip:          normalized?.zip            ?? null,
    }
  } catch {
    return fallback
  }
}
