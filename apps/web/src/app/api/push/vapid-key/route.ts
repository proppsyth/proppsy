import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Returns the VAPID public key so clients can subscribe to push
export async function GET() {
  const key = process.env.VAPID_PUBLIC_KEY ?? null
  return NextResponse.json({ key })
}
