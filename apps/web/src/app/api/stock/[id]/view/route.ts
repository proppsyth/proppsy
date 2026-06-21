import { createServiceClient } from '@/lib/supabase/server'
import { notify } from '@/lib/notifications/notify'
import { NextResponse } from 'next/server'

const MILESTONES: Record<number, 'listing_views_10' | 'listing_views_100' | 'listing_views_1000'> = {
  10: 'listing_views_10',
  100: 'listing_views_100',
  1000: 'listing_views_1000',
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  if (!id) return NextResponse.json({ ok: false }, { status: 400 })

  const supabase = createServiceClient()
  await supabase.rpc('increment_stock_view', { stock_id: id })

  // Fire a one-off milestone notification when views cross 10 / 100 / 1000.
  const { data: s } = await supabase
    .from('stock')
    .select('view_count, agent_uid, project_name, unit_no')
    .eq('id', id)
    .maybeSingle()

  const views = (s as { view_count?: number } | null)?.view_count
  const agentUid = (s as { agent_uid?: string } | null)?.agent_uid
  if (views && agentUid && MILESTONES[views]) {
    const label = [(s as { project_name?: string }).project_name, (s as { unit_no?: string }).unit_no].filter(Boolean).join(' ') || id
    await notify({
      user_id: agentUid,
      type:    MILESTONES[views],
      title:   `🎉 ทรัพย์มีผู้เข้าชม ${views.toLocaleString()} ครั้ง`,
      message: `${label} มีคนเข้าดูครบ ${views.toLocaleString()} ครั้งแล้ว`,
      url:     `/stock/${id}`,
    })
  }

  return NextResponse.json({ ok: true })
}
