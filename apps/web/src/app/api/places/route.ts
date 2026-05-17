import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import type { PlacesData, PlaceRecord, SubdistrictRecord } from '@/lib/address/types'

// Re-export for consumers that import the type from this file
export type { PlacesData }

let cached: PlacesData | null = null

function build(): PlacesData {
  if (cached) return cached

  const filePath = path.join(process.cwd(), 'public', 'template-doc', 'places.csv')
  const text = fs.readFileSync(filePath, 'utf-8')
  const lines = text.split('\n').slice(1) // skip header

  const provSet = new Map<string, PlaceRecord>()
  const distMap = new Map<string, Map<string, PlaceRecord>>()
  const subMap  = new Map<string, Map<string, SubdistrictRecord>>()

  for (const line of lines) {
    const parts = line.trim().split(',')
    if (parts.length < 7) continue
    const [pt, pe, dtt, de, st, se, z] = parts
    if (!pt || !dtt || !st || !z) continue
    const zip = z.trim()

    if (!provSet.has(pt)) provSet.set(pt, { th: pt, en: pe ?? '' })

    if (!distMap.has(pt)) distMap.set(pt, new Map())
    if (!distMap.get(pt)!.has(dtt)) distMap.get(pt)!.set(dtt, { th: dtt, en: de ?? '' })

    const subKey = `${pt}|${dtt}`
    if (!subMap.has(subKey)) subMap.set(subKey, new Map())
    if (!subMap.get(subKey)!.has(st)) subMap.get(subKey)!.set(st, { th: st, en: se ?? '', zip })
  }

  cached = {
    provinces: Array.from(provSet.values()),
    districts: Object.fromEntries(Array.from(distMap, ([k, v]) => [k, Array.from(v.values())])),
    subdistricts: Object.fromEntries(Array.from(subMap, ([k, v]) => [k, Array.from(v.values())])),
  }
  return cached
}

export function GET() {
  try {
    const data = build()
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'public, max-age=86400' },
    })
  } catch (err) {
    console.error('[places] CSV build failed:', err)
    return NextResponse.json({ provinces: [], districts: {}, subdistricts: {} }, { status: 500 })
  }
}
