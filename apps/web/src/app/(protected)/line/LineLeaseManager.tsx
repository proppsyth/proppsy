'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Send, Loader2, CheckCircle2, XCircle, RefreshCw } from 'lucide-react'
import {
  bindLeaseGroup, setLeaseReminder, sendTestReminder,
  type LeaseLineRow, type LineGroupOption,
} from './actions'

interface Props {
  leases: LeaseLineRow[]
  groups: LineGroupOption[]
}

function baht(n: number | null) {
  return n == null ? '-' : '฿' + new Intl.NumberFormat('th-TH').format(n)
}

export default function LineLeaseManager({ leases, groups }: Props) {
  const router = useRouter()
  const [busyId, setBusyId] = useState<string | null>(null)
  const [msg, setMsg] = useState<{ id: string; ok: boolean; text: string } | null>(null)
  const [, startTransition] = useTransition()

  function run(id: string, fn: () => Promise<{ error?: string }>, okText?: string) {
    setBusyId(id); setMsg(null)
    startTransition(async () => {
      const res = await fn()
      setBusyId(null)
      if (res.error) setMsg({ id, ok: false, text: res.error })
      else if (okText) setMsg({ id, ok: true, text: okText })
      router.refresh()
    })
  }

  if (leases.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-sm text-gray-400 text-center">
        ยังไม่มีสัญญาเช่า — เมื่อสร้างสัญญาเช่าแล้วจะมาตั้งค่าแจ้งเตือนที่นี่ได้
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <p className="text-sm font-semibold text-gray-800">ตั้งค่าแจ้งเตือนต่อสัญญาเช่า</p>
        <button onClick={() => router.refresh()} title="รีเฟรชรายชื่อกลุ่ม"
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600">
          <RefreshCw className="w-3.5 h-3.5" /> รีเฟรชกลุ่ม
        </button>
      </div>

      {groups.length === 0 && (
        <div className="mx-4 mt-3 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 text-xs text-amber-700">
          ยังไม่พบกลุ่ม LINE — เพิ่ม OA ของคุณเข้ากลุ่มลูกค้า แล้วพิมพ์ข้อความอะไรก็ได้ในกลุ่ม 1 ครั้ง จากนั้นกด &ldquo;รีเฟรชกลุ่ม&rdquo;
        </div>
      )}

      <div className="divide-y divide-gray-100">
        {leases.map(l => (
          <div key={l.id} className="p-4 space-y-2.5">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{l.projectUnit}</p>
                <p className="text-xs text-gray-500">{l.tenantName} · {baht(l.rentPrice)}/เดือน · {l.id}</p>
              </div>
            </div>

            {/* Group binding */}
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-500 w-16 flex-shrink-0">กลุ่ม LINE</label>
              <select
                value={l.groupId ?? ''}
                disabled={busyId === l.id}
                onChange={e => run(l.id, () => bindLeaseGroup(l.id, e.target.value || null))}
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

            {/* Toggles + test (only meaningful once a group is bound) */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pl-16">
              <Toggle
                label="แจ้งค่าเช่ารายเดือน"
                checked={l.rentEnabled}
                disabled={!l.groupId || busyId === l.id}
                onChange={v => run(l.id, () => setLeaseReminder(l.id, 'rent', v))}
              />
              <Toggle
                label="แจ้งหมดสัญญา (30 วัน)"
                checked={l.expiryEnabled}
                disabled={!l.groupId || busyId === l.id}
                onChange={v => run(l.id, () => setLeaseReminder(l.id, 'expiry', v))}
              />
              <button
                onClick={() => run(l.id, () => sendTestReminder(l.id), 'ส่งข้อความทดสอบแล้ว')}
                disabled={!l.groupId || busyId === l.id}
                className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {busyId === l.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                ส่งทดสอบ
              </button>
            </div>

            {msg?.id === l.id && (
              <div className={`flex items-center gap-1.5 text-xs pl-16 ${msg.ok ? 'text-green-600' : 'text-red-600'}`}>
                {msg.ok ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                {msg.text}
              </div>
            )}
          </div>
        ))}
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
