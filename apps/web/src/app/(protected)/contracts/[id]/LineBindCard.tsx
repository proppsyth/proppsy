'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { MessageCircle, Send, Loader2, CheckCircle2, XCircle } from 'lucide-react'
import {
  bindLeaseGroup, setLeaseReminder, sendTestReminder,
  type LineGroupOption,
} from '../../line/actions'

interface Props {
  contractId: string
  connected: boolean
  groups: LineGroupOption[]
  groupId: string | null
  rentEnabled: boolean
  expiryEnabled: boolean
}

export default function LineBindCard({ contractId, connected, groups, groupId, rentEnabled, expiryEnabled }: Props) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [, start] = useTransition()

  function run(fn: () => Promise<{ error?: string }>, okText?: string) {
    setBusy(true); setMsg(null)
    start(async () => {
      const res = await fn()
      setBusy(false)
      if (res.error) setMsg({ ok: false, text: res.error })
      else if (okText) setMsg({ ok: true, text: okText })
      router.refresh()
    })
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50/70 flex items-center gap-2">
        <MessageCircle className="w-4 h-4 text-green-600" />
        <h2 className="text-sm font-semibold text-gray-700">แจ้งเตือนกลุ่ม LINE</h2>
      </div>

      <div className="p-4 space-y-3">
        {!connected ? (
          <p className="text-xs text-gray-500">
            ยังไม่ได้เชื่อม LINE OA —{' '}
            <Link href="/line" className="text-blue-600 hover:underline">ไปที่หน้า LINE เพื่อเชื่อมต่อ</Link>
          </p>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-500 w-16 flex-shrink-0">กลุ่ม</label>
              <select
                value={groupId ?? ''}
                disabled={busy}
                onChange={e => run(() => bindLeaseGroup(contractId, e.target.value || null))}
                className="flex-1 px-2.5 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              >
                <option value="">— ยังไม่ผูกกลุ่ม —</option>
                {groups.map(g => (
                  <option key={g.groupId} value={g.groupId}>
                    {g.groupName || `กลุ่ม (${g.groupId.slice(0, 8)}…)`}
                  </option>
                ))}
              </select>
            </div>

            {groups.length === 0 && (
              <p className="text-xs text-amber-600">
                ยังไม่พบกลุ่ม — เพิ่ม LINE OA เข้ากลุ่มลูกค้า แล้วพิมพ์ข้อความในกลุ่ม 1 ครั้ง จากนั้นโหลดหน้านี้ใหม่
              </p>
            )}

            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pl-16">
              <Toggle label="แจ้งค่าเช่ารายเดือน" checked={rentEnabled} disabled={!groupId || busy}
                onChange={v => run(() => setLeaseReminder(contractId, 'rent', v))} />
              <Toggle label="แจ้งหมดสัญญา (30 วัน)" checked={expiryEnabled} disabled={!groupId || busy}
                onChange={v => run(() => setLeaseReminder(contractId, 'expiry', v))} />
              <button
                onClick={() => run(() => sendTestReminder(contractId), 'ส่งข้อความทดสอบแล้ว')}
                disabled={!groupId || busy}
                className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                ส่งทดสอบ
              </button>
            </div>

            {msg && (
              <div className={`flex items-center gap-1.5 text-xs pl-16 ${msg.ok ? 'text-green-600' : 'text-red-600'}`}>
                {msg.ok ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                {msg.text}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function Toggle({ label, checked, disabled, onChange }: {
  label: string; checked: boolean; disabled?: boolean; onChange: (v: boolean) => void
}) {
  return (
    <button type="button" disabled={disabled} onClick={() => onChange(!checked)}
      className="flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed">
      <span className={`relative w-9 h-5 rounded-full transition-colors ${checked ? 'bg-green-500' : 'bg-gray-200'}`}>
        <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-4' : ''}`} />
      </span>
      <span className="text-xs text-gray-600">{label}</span>
    </button>
  )
}
