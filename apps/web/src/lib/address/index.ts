import 'server-only'
import fs from 'fs'
import path from 'path'
import type { PlaceRecord, SubdistrictRecord, PlacesData, NormalizedAddress, AddressFields } from './types'

interface CsvRow {
  prov_th: string; prov_en: string
  dist_th: string; dist_en: string
  sub_th: string;  sub_en: string
  zip: string
}

let _rows: CsvRow[] | null = null

function loadRows(): CsvRow[] {
  if (_rows) return _rows
  const filePath = path.join(process.cwd(), 'public', 'template-doc', 'places.csv')
  const text = fs.readFileSync(filePath, 'utf-8')
  const lines = text.split('\n').slice(1)
  const rows: CsvRow[] = []
  for (const line of lines) {
    const parts = line.trim().split(',')
    if (parts.length < 7) continue
    const [prov_th, prov_en, dist_th, dist_en, sub_th, sub_en, zip] = parts as [string, string, string, string, string, string, string]
    if (!prov_th || !dist_th || !sub_th || !zip) continue
    rows.push({ prov_th, prov_en: prov_en ?? '', dist_th, dist_en: dist_en ?? '', sub_th, sub_en: sub_en ?? '', zip: zip.trim() })
  }
  _rows = rows
  return rows
}

// Normalize a search key: lowercase, trim whitespace, strip administrative prefixes
const STRIP_RE = /^(กรุงเทพมหานคร|นครหลวง|เขต|อำเภอ|แขวง|ตำบล|amphoe|tambon|khwaeng|khet|district|sub-?district|province)\s*/i

function toKey(s: string): string {
  return s.trim().toLowerCase().replace(STRIP_RE, '').trim()
}

// Lazy indexes: Map<key → row[]>
let _provIdx: Map<string, CsvRow[]> | null = null
let _distIdx: Map<string, CsvRow[]> | null = null
let _subIdx: Map<string, CsvRow[]> | null = null

function provIdx(): Map<string, CsvRow[]> {
  if (_provIdx) return _provIdx
  const rows = loadRows()
  const m = new Map<string, CsvRow[]>()
  for (const r of rows) {
    for (const k of [toKey(r.prov_th), toKey(r.prov_en)]) {
      if (!m.has(k)) m.set(k, [])
      m.get(k)!.push(r)
    }
  }
  _provIdx = m
  return m
}

function distIdx(): Map<string, CsvRow[]> {
  if (_distIdx) return _distIdx
  const rows = loadRows()
  const m = new Map<string, CsvRow[]>()
  for (const r of rows) {
    for (const k of [toKey(r.dist_th), toKey(r.dist_en)]) {
      if (!m.has(k)) m.set(k, [])
      m.get(k)!.push(r)
    }
  }
  _distIdx = m
  return m
}

function subIdx(): Map<string, CsvRow[]> {
  if (_subIdx) return _subIdx
  const rows = loadRows()
  const m = new Map<string, CsvRow[]>()
  for (const r of rows) {
    for (const k of [toKey(r.sub_th), toKey(r.sub_en)]) {
      if (!m.has(k)) m.set(k, [])
      m.get(k)!.push(r)
    }
  }
  _subIdx = m
  return m
}

function rowToNormalized(r: CsvRow): NormalizedAddress {
  return {
    province_th: r.prov_th, province_en: r.prov_en,
    district_th: r.dist_th, district_en: r.dist_en,
    subdistrict_th: r.sub_th, subdistrict_en: r.sub_en,
    zip: r.zip,
  }
}

/**
 * Normalize arbitrary province/district/subdistrict inputs (Thai or English)
 * to a canonical NormalizedAddress. Returns null if no match found.
 */
export function normalizeAddressFields(fields: AddressFields): NormalizedAddress | null {
  const { province, district, subdistrict } = fields

  let candidates: CsvRow[] = loadRows()

  if (province) {
    const k = toKey(province)
    const hit = provIdx().get(k)
    if (!hit || hit.length === 0) return null
    candidates = hit
  }

  if (district) {
    const k = toKey(district)
    const distCandidates = distIdx().get(k) ?? []
    candidates = candidates.filter(r => distCandidates.includes(r))
    if (candidates.length === 0) return null
  }

  if (subdistrict) {
    const k = toKey(subdistrict)
    const subCandidates = subIdx().get(k) ?? []
    candidates = candidates.filter(r => subCandidates.includes(r))
    if (candidates.length === 0) return null
  }

  const first = candidates[0]
  if (!first) return null
  return rowToNormalized(first)
}

/**
 * Look up English address parts from stored Thai values.
 * Returns partial results for whichever levels are found.
 */
export function getEnglishAddress(
  province_th?: string,
  district_th?: string,
  subdistrict_th?: string,
): Partial<NormalizedAddress> {
  const result = normalizeAddressFields({
    province: province_th,
    district: district_th,
    subdistrict: subdistrict_th,
  })
  return result ?? {}
}

/**
 * Build the full bilingual PlacesData structure for the API route.
 * Provinces → unique list; Districts keyed by province_th; Subdistricts keyed by province_th|district_th.
 */
export function buildPlacesData(): PlacesData {
  const rows = loadRows()

  const provSet = new Map<string, PlaceRecord>()
  const distMap = new Map<string, Map<string, PlaceRecord>>()
  const subMap = new Map<string, Map<string, SubdistrictRecord>>()

  for (const r of rows) {
    if (!provSet.has(r.prov_th)) {
      provSet.set(r.prov_th, { th: r.prov_th, en: r.prov_en })
    }

    const distKey = r.prov_th
    if (!distMap.has(distKey)) distMap.set(distKey, new Map())
    const distLevel = distMap.get(distKey)!
    if (!distLevel.has(r.dist_th)) {
      distLevel.set(r.dist_th, { th: r.dist_th, en: r.dist_en })
    }

    const subKey = `${r.prov_th}|${r.dist_th}`
    if (!subMap.has(subKey)) subMap.set(subKey, new Map())
    const subLevel = subMap.get(subKey)!
    if (!subLevel.has(r.sub_th)) {
      subLevel.set(r.sub_th, { th: r.sub_th, en: r.sub_en, zip: r.zip })
    }
  }

  const provinces: PlaceRecord[] = Array.from(provSet.values())

  const districts: Record<string, PlaceRecord[]> = {}
  for (const [prov, dists] of distMap) {
    districts[prov] = Array.from(dists.values())
  }

  const subdistricts: Record<string, SubdistrictRecord[]> = {}
  for (const [key, subs] of subMap) {
    subdistricts[key] = Array.from(subs.values())
  }

  return { provinces, districts, subdistricts }
}
