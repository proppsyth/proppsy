import { NextResponse } from 'next/server'
import { buildPlacesData } from '@/lib/address'
import type { PlacesData } from '@/lib/address/types'

export type { PlacesData }

let cached: ReturnType<typeof buildPlacesData> | null = null

export function GET() {
  if (!cached) cached = buildPlacesData()
  return NextResponse.json(cached, {
    headers: { 'Cache-Control': 'public, max-age=86400' },
  })
}
