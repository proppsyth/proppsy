import { NextRequest, NextResponse } from 'next/server'
import { createHmac, timingSafeEqual } from 'crypto'
import { createAdminClient } from '@/lib/supabase/server'
import { getGroupSummary } from '@/lib/line/client'

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

export async function POST(req: NextRequest) {
  const rawBody = await req.text()
  const signature = req.headers.get('x-line-signature')

  let body: LineWebhookBody
  try {
    body = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }

  const destination = body.destination
  if (!destination) return NextResponse.json({ received: true })

  const admin = await createAdminClient()

  // Resolve which agent this webhook belongs to via the bot's own userId.
  const { data: integ } = await admin
    .from('line_integrations')
    .select('agent_uid, channel_secret, channel_access_token')
    .eq('bot_user_id', destination)
    .maybeSingle()

  if (!integ) {
    // Unknown bot — accept (200) so LINE doesn't retry, but do nothing.
    return NextResponse.json({ received: true })
  }

  // Record that LINE reached us (even before signature check) so the UI can show
  // "last received" — distinguishes a console misconfig from a handler problem.
  const firstEventType = body.events?.[0]?.type ?? 'verify'

  if (!validSignature(rawBody, integ.channel_secret, signature)) {
    await admin.from('line_integrations')
      .update({ last_webhook_at: new Date().toISOString(), last_webhook_event: 'signature_failed' })
      .eq('agent_uid', integ.agent_uid)
    return NextResponse.json({ error: 'invalid signature' }, { status: 401 })
  }

  await admin.from('line_integrations')
    .update({ last_webhook_at: new Date().toISOString(), last_webhook_event: firstEventType })
    .eq('agent_uid', integ.agent_uid)

  for (const ev of body.events ?? []) {
    const src = ev.source
    const groupId = src?.groupId
    if (!groupId) continue

    if (ev.type === 'leave' || ev.type === 'memberLeft') {
      await admin.from('line_groups')
        .update({ is_active: false })
        .eq('agent_uid', integ.agent_uid)
        .eq('group_id', groupId)
      continue
    }

    // join / message (and any group event) → ensure the group is recorded + active.
    if (ev.type === 'join' || ev.type === 'message' || ev.type === 'memberJoined') {
      const groupName = await getGroupSummary(integ.channel_access_token, groupId)
      await admin.from('line_groups')
        .upsert({
          agent_uid:  integ.agent_uid,
          group_id:   groupId,
          group_name: groupName,
          is_active:  true,
        }, { onConflict: 'agent_uid,group_id' })
    }
  }

  return NextResponse.json({ received: true })
}

// LINE verifies the webhook with a GET/HEAD "Verify" button in some flows.
export async function GET() {
  return NextResponse.json({ ok: true })
}
