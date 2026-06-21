import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { MessageCircle } from 'lucide-react'
import LineConnectPanel from './LineConnectPanel'
import OnboardingGuide from './OnboardingGuide'
import LineLeaseManager from './LineLeaseManager'
import { listLeasesForLine, listLineGroups } from './actions'

export const metadata: Metadata = { title: 'แจ้งเตือนผ่าน LINE' }

const WEBHOOK_URL =
  (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.proppsy.com') + '/api/line/webhook'

function WebhookStatus({ lastWebhookAt, lastWebhookEvent, groupCount }: {
  lastWebhookAt: string | null
  lastWebhookEvent: string | null
  groupCount: number
}) {
  if (!lastWebhookAt) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-800 space-y-1">
        <p className="font-semibold">📡 ยังไม่เคยได้รับสัญญาณจาก LINE</p>
        <p>แปลว่า LINE ยังไม่ได้ยิง event มาที่ระบบ ให้ตรวจในคอนโซล LINE ว่า:</p>
        <ul className="list-disc pl-4 space-y-0.5">
          <li><b>Response mode = Bot</b> (ไม่ใช่ Chat) — ที่ LINE Official Account Manager → ตั้งค่า → การตอบกลับ</li>
          <li><b>Use webhook</b> เปิดอยู่ + วาง Webhook URL ถูกต้องแล้วกด Verify</li>
          <li><b>Allow bot to join group chats</b> เปิดอยู่</li>
        </ul>
      </div>
    )
  }
  const when = new Date(lastWebhookAt).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' })
  if (lastWebhookEvent === 'signature_failed') {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-xs text-red-700">
        ⚠️ ได้รับสัญญาณจาก LINE ({when}) แต่ <b>ลายเซ็นไม่ตรง</b> — Channel secret อาจผิด กรุณาเชื่อมต่อใหม่อีกครั้ง
      </div>
    )
  }
  return (
    <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-xs text-green-700">
      ✅ ได้รับสัญญาณจาก LINE ล่าสุด: {when}
      {groupCount === 0 && (
        <span className="block text-green-600 mt-0.5">
          ยังไม่พบกลุ่ม — ลองพิมพ์ข้อความอะไรก็ได้ในกลุ่มที่มีบอท 1 ครั้ง แล้วโหลดหน้านี้ใหม่
        </span>
      )}
    </div>
  )
}

export default async function LinePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Never expose the token/secret to the client — only the status + bot identity.
  const { data: integ } = await supabase
    .from('line_integrations')
    .select('enabled, bot_display_name, bot_basic_id, last_webhook_at, last_webhook_event')
    .eq('agent_uid', user.id)
    .maybeSingle()

  const connected = !!integ
  const lastWebhookAt = (integ as { last_webhook_at?: string | null } | null)?.last_webhook_at ?? null
  const lastWebhookEvent = (integ as { last_webhook_event?: string | null } | null)?.last_webhook_event ?? null

  const [leases, groups] = connected
    ? await Promise.all([listLeasesForLine(), listLineGroups()])
    : [[], []]

  return (
    <div className="max-w-3xl mx-auto px-4 py-5 space-y-5">
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center">
          <MessageCircle className="w-5 h-5 text-green-600" />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-gray-800">แจ้งเตือนผ่าน LINE</h1>
          <p className="text-xs text-gray-500">เชื่อม LINE OA ของคุณ เพื่อส่งแจ้งเตือนค่าเช่า &amp; วันหมดสัญญาเข้ากลุ่มลูกค้าอัตโนมัติ</p>
        </div>
      </div>

      <LineConnectPanel
        connected={connected}
        enabled={integ?.enabled ?? false}
        botDisplayName={integ?.bot_display_name ?? null}
        botBasicId={integ?.bot_basic_id ?? null}
      />

      {connected && (
        <WebhookStatus lastWebhookAt={lastWebhookAt} lastWebhookEvent={lastWebhookEvent} groupCount={groups.length} />
      )}

      {connected && <LineLeaseManager leases={leases} groups={groups} />}

      <OnboardingGuide webhookUrl={WEBHOOK_URL} />
    </div>
  )
}
