import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { MessageCircle } from 'lucide-react'
import LineConnectPanel from './LineConnectPanel'
import OnboardingGuide from './OnboardingGuide'

export const metadata: Metadata = { title: 'แจ้งเตือนผ่าน LINE' }

const WEBHOOK_URL =
  (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.proppsy.com') + '/api/line/webhook'

export default async function LinePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Never expose the token/secret to the client — only the status + bot identity.
  const { data: integ } = await supabase
    .from('line_integrations')
    .select('enabled, bot_display_name, bot_basic_id')
    .eq('agent_uid', user.id)
    .maybeSingle()

  const connected = !!integ

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

      <OnboardingGuide webhookUrl={WEBHOOK_URL} />

      {connected && (
        <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-xs text-blue-700">
          ✅ เชื่อมต่อแล้ว — ขั้นถัดไป: เพิ่ม LINE OA ของคุณเข้ากลุ่มลูกค้า แล้วผูกกลุ่มกับสัญญาเช่า
          (ฟังก์ชันผูกกลุ่ม &amp; ตั้งเวลาแจ้งเตือนกำลังจะมาในขั้นถัดไป)
        </div>
      )}
    </div>
  )
}
