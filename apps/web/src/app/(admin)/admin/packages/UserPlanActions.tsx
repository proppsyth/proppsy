'use client'

import { useState, useTransition } from 'react'
import { setUserPlan } from './actions'
import type { Plan } from '@/types'

const PLAN_OPTS: { value: Plan; label: string }[] = [
  { value: 'starter', label: 'Starter' },
  { value: 'professional', label: 'Professional' },
  { value: 'business', label: 'Business' },
]

// Quick period presets — compute an expiry date relative to today.
function dateFromNow({ months = 0, years = 0 }: { months?: number; years?: number }): string {
  const d = new Date()
  if (months) d.setMonth(d.getMonth() + months)
  if (years) d.setFullYear(d.getFullYear() + years)
  return d.toISOString().slice(0, 10)
}

interface Props {
  userId: string
  currentPlan: Plan
  currentExpiry: string | null
}

export default function UserPlanActions({ userId, currentPlan, currentExpiry }: Props) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [plan, setPlan] = useState<Plan>(currentPlan)
  const [expiry, setExpiry] = useState(currentExpiry ? currentExpiry.slice(0, 10) : '')
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  if (done) return <span className="text-[11px] text-green-600">อัปเดตแล้ว ✓</span>

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-[11px] text-blue-500 hover:underline whitespace-nowrap"
      >
        แก้ไข
      </button>
    )
  }

  return (
    <div className="mt-2 p-2.5 bg-gray-50 border border-gray-200 rounded-lg space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] text-gray-400 block mb-0.5">แพ็กเกจ</label>
          <select
            value={plan}
            onChange={e => setPlan(e.target.value as Plan)}
            className="w-full text-xs px-2 py-1.5 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-blue-300"
          >
            {PLAN_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[10px] text-gray-400 block mb-0.5">หมดอายุ (ว่าง = ไม่มีกำหนด)</label>
          <input
            type="date"
            value={expiry}
            onChange={e => setExpiry(e.target.value)}
            className="w-full text-xs px-2 py-1.5 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-blue-300"
          />
        </div>
      </div>
      {/* Quick period presets (for direct/manual payments, not via Omise) */}
      <div className="flex gap-1.5 flex-wrap">
        {[
          { label: 'รายเดือน', value: dateFromNow({ months: 1 }) },
          { label: 'รายปี', value: dateFromNow({ years: 1 }) },
          { label: 'ไม่มีกำหนด', value: '' },
        ].map(p => (
          <button
            key={p.label}
            type="button"
            onClick={() => setExpiry(p.value)}
            className={`px-2.5 py-1 text-[11px] rounded-full border transition ${
              expiry === p.value
                ? 'bg-blue-50 border-blue-300 text-blue-700 font-medium'
                : 'border-gray-200 text-gray-500 hover:bg-white'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
      {error && <p className="text-[11px] text-red-500">{error}</p>}
      <div className="flex gap-1.5">
        <button
          onClick={() => setOpen(false)}
          className="flex-1 text-xs py-1.5 border border-gray-200 text-gray-500 rounded-lg hover:bg-white transition"
        >
          ยกเลิก
        </button>
        <button
          disabled={pending}
          onClick={() => {
            setError('')
            startTransition(async () => {
              const res = await setUserPlan(
                userId,
                plan,
                expiry ? new Date(expiry).toISOString() : null,
              )
              if (res.error) { setError(res.error); return }
              setDone(true)
            })
          }}
          className="flex-1 text-xs py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-lg transition"
        >
          {pending ? 'บันทึก…' : 'บันทึก'}
        </button>
      </div>
    </div>
  )
}
