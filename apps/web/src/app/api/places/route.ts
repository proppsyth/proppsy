import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export type PlacesData = {
  [province: string]: {
    [district: string]: {
      [subdistrict: string]: string // zip
    }
  }
}

let cached: PlacesData | null = null

function parse(): PlacesData {
  if (cached) return cached
  const filePath = path.join(process.cwd(), 'public', 'template-doc', 'places.csv')
  const text = fs.readFileSync(filePath, 'utf-8')
  const lines = text.split('\n').slice(1) // skip header
  const data: PlacesData = {}
  for (const line of lines) {
    const parts = line.trim().split(',')
    if (parts.length < 7) continue
    const [prov, , dist, , sub, , zip] = parts
    if (!prov || !dist || !sub || !zip) continue
    if (!data[prov]) data[prov] = {}
    if (!data[prov][dist]) data[prov][dist] = {}
    data[prov][dist][sub] = zip.trim()
  }
  cached = data
  return data
}

export function GET() {
  const data = parse()
  return NextResponse.json(data, {
    headers: { 'Cache-Control': 'public, max-age=86400' },
  })
}
