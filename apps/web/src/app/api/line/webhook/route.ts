import { NextRequest, NextResponse } from 'next/server'
import { createHmac, timingSafeEqual } from 'crypto'
import { createServiceClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

// LINE signs the raw body with HMAC-SHA256(channelSecret) → base64 in x-line-signature.
function validSignature(rawBody: string, secret: string, signature: string | null): boolean {
  if (!signature) return false
  const expected = createHmac('sha256', secret).update(rawBody).digest('base64')
  const a = Buffer.from(expected)
  const b = Buffer.from(signature)
  return a.length === b.length && timingSafeEqual(a, b)
}

interface LineSource { type?: string; groupId?: string; roomId?: string; userId?: string }
interface LineEvent { type?: string; source?: LineSource }
interface LineWebhookBody { destination?: string; events?: LineEvent[] }

// LINE's "Verify" button (and connection checks) sends an empty events array and
// expects a fast 200. Keep this path free of any DB / network work so it never
// times out — especially on a cold serverless start.
export async function POST(req: NextRequest) {
  const rawBody = await req.text()
  const signature = req.headers.get('x-line-signature')

  let body: LineWebhookBody
  try {
    body = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ received: true })
  }

  const events = body.events ?? []
  const destination = body.destination

  // Verify ping / no events → respond immediately.
  if (events.length === 0 || !destination) {
    return NextResponse.json({ received: true })
  }

  // Do the real work after responding is not reliable in serverless, so we keep
  // the work minimal: one indexed lookup, one update, and per-group upserts.
  // No external LINE API calls here (group names are filled in lazily elsewhere).
  const admin = createServiceClient()

  const { data: integ } = await admin
    .from('line_integrations')
    .select('agent_uid, channel_secret')
    .eq('bot_user_id', destination)
    .maybeSingle()

  if (!integ) return NextResponse.json({ received: true })

  if (!validSignature(rawBody, integ.channel_secret, signature)) {
    await admin.from('line_integrations')
      .update({ last_webhook_at: new Date().toISOString(), last_webhook_event: 'signature_failed' })
      .eq('agent_uid', integ.agent_uid)
    return NextResponse.json({ error: 'invalid signature' }, { status: 401 })
  }

  await admin.from('line_integrations')
    .update({ last_webhook_at: new Date().toISOString(), last_webhook_event: events[0]?.type ?? 'event' })
    .eq('agent_uid', integ.agent_uid)

  for (const ev of events) {
    const groupId = ev.source?.groupId
    if (!groupId) continue

    if (ev.type === 'leave' || ev.type === 'memberLeft') {
      await admin.from('line_groups')
        .update({ is_active: false })
        .eq('agent_uid', integ.agent_uid)
        .eq('group_id', groupId)
      continue
    }

    if (ev.type === 'join' || ev.type === 'message' || ev.type === 'memberJoined') {
      // group_name is intentionally omitted (filled in lazily when listing groups)
      // so the webhook never blocks on the LINE summary API.
      await admin.from('line_groups')
        .upsert({ agent_uid: integ.agent_uid, group_id: groupId, is_active: true },
          { onConflict: 'agent_uid,group_id' })
    }
  }

  return NextResponse.json({ received: true })
}

// Some LINE flows probe the endpoint with GET.
export async function GET() {
  return NextResponse.json({ ok: true })
}
