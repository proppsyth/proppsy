'use client'

import { useState } from 'react'
import { Pencil, X, Save, Infinity } from 'lucide-react'
import { updatePlanLimits } from './actions'
import type { PlanLimitRow } from '@/lib/planLimits'

interface Props {
  plan: string
  label: string
  badge: string
  row: PlanLimitRow
}

export default function PlanEditor({ plan, label, badge, row }: Props) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [maxStock, setMaxStock] = useState<string>(
    row.max_stock === null ? '' : String(row.max_stock)
  )
  const [maxContracts, setMaxContracts] = useState<string>(
    row.max_contracts_per_month === null ? '' : String(row.max_contracts_per_month)
  )
  const [aiCalls, setAiCalls] = useState<string>(String(row.ai_calls_per_month))

  async function handleSave() {
    setSaving(true)
    setError(null)
    const result = await updatePlanLimits({
      plan,
      max_stock: maxStock === '' ? null : Number(maxStock),
      max_contracts_per_month: maxContracts === '' ? null : Number(maxContracts),
      ai_calls_per_month: Number(aiCalls) || 0,
    })
    setSaving(false)
    if (result.error) {
      setError(result.error)
    } else {
      setOpen(false)
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mt-4 w-full py-2 border border-blue-200 text-blue-600 text-sm rounded-xl hover:bg-blue-50 transition flex items-center justify-center gap-1.5"
      >
        <Pencil className="w-3.5 h-3.5" />
        แก้ไข
      </button>
    )
  }

  return (
    <div className="mt-4 border border-blue-200 rounded-xl p-4 bg-blue-50/40 space-y-3">
      <div className="flex items-center justify-between">
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-lg ${badge}`}>{label}</span>
        <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600">
          <X className="w-4 h-4" />
        </button>
      </div>

      <LimitField
        label="ทรัพย์สูงสุด"
        value={maxStock}
        onChange={setMaxStock}
        placeholder="ว่าง = ไม่จำกัด"
      />
      <LimitField
        label="สัญญา/เดือน"
        value={maxContracts}
        onChange={setMaxContracts}
        placeholder="ว่าง = ไม่จำกัด"
      />
      <LimitField
        label="AI ครั้ง/เดือน"
        value={aiCalls}
        onChange={setAiCalls}
        placeholder="0"
        required
      />

      {error && <p className="text-xs text-red-500">{error}</p>}

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm rounded-xl transition flex items-center justify-center gap-1.5"
      >
        <Save className="w-3.5 h-3.5" />
        {saving ? 'กำลังบันทึก…' : 'บันทึก'}
      </button>
    </div>
  )
}

function LimitField({
  label, value, onChange, placeholder, required = false,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  required?: boolean
}) {
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-1 flex items-center gap-1">
        {label}
        {!required && <Infinity className="w-3 h-3 text-gray-400" />}
      </label>
      <input
        type="number"
        min={0}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full text-sm px-3 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
      />
    </div>
  )
}
