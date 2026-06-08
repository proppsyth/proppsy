import { createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  if (!id) return NextResponse.json({ ok: false }, { status: 400 })

  const supabase = createServiceClient()
  await supabase.rpc('increment_stock_view', { stock_id: id })

  return NextResponse.json({ ok: true })
}
