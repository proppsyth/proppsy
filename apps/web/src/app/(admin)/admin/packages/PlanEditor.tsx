'use client'

import { useState } from 'react'
import { Pencil, X, Save, Plus, Trash2 } from 'lucide-react'
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
  const [success, setSuccess] = useState(false)

  const [maxStock, setMaxStock] = useState(row.max_stock === null ? '' : String(row.max_stock))
  const [maxContracts, setMaxContracts] = useState(row.max_contracts_per_month === null ? '' : String(row.max_contracts_per_month))
  const [aiCalls, setAiCalls] = useState(String(row.ai_calls_per_month))
  const [priceMonthly, setPriceMonthly] = useState(String(row.price_monthly_thb ?? 0))
  const [priceYearly, setPriceYearly] = useState(String(row.price_yearly_thb ?? 0))
  const [isActive, setIsActive] = useState(row.is_active)
  const [features, setFeatures] = useState<string[]>(row.feature_list ?? [])
  const [newFeature, setNewFeature] = useState('')

  function addFeature() {
    const v = newFeature.trim()
    if (!v) return
    setFeatures(f => [...f, v])
    setNewFeature('')
  }

  function removeFeature(i: number) {
    setFeatures(f => f.filter((_, idx) => idx !== i))
  }

  function moveFeature(i: number, dir: -1 | 1) {
    setFeatures(f => {
      const a = [...f]
      const j = i + dir
      if (j < 0 || j >= a.length) return a
      const tmp = a[i]!
      a[i] = a[j]!
      a[j] = tmp
      return a
    })
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    setSuccess(false)
    const result = await updatePlanLimits({
      plan,
      max_stock: maxStock === '' ? null : Number(maxStock),
      max_contracts_per_month: maxContracts === '' ? null : Number(maxContracts),
      ai_calls_per_month: Number(aiCalls) || 0,
      is_active: isActive,
      price_monthly_thb: Number(priceMonthly) || 0,
      price_yearly_thb: Number(priceYearly) || 0,
      feature_list: features,
    })
    setSaving(false)
    if (result.error) {
      setError(result.error)
    } else {
      setSuccess(true)
      setTimeout(() => { setSuccess(false); setOpen(false) }, 800)
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
    <div className="mt-4 border border-blue-200 rounded-xl p-4 bg-blue-50/30 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-lg ${badge}`}>{label}</span>
        <div className="flex items-center gap-2">
          {/* Active toggle */}
          <label className="flex items-center gap-1.5 cursor-pointer">
            <span className="text-xs text-gray-500">{isActive ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}</span>
            <button
              type="button"
              onClick={() => setIsActive(v => !v)}
              className={`relative w-9 h-5 rounded-full transition-colors ${isActive ? 'bg-green-500' : 'bg-gray-300'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${isActive ? 'translate-x-4' : ''}`} />
            </button>
          </label>
          <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Limits */}
      <div>
        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2">ขีดจำกัด</p>
        <div className="grid grid-cols-3 gap-2">
          <NumField label="ทรัพย์สูงสุด" value={maxStock} onChange={setMaxStock} placeholder="∞" />
          <NumField label="สัญญา/เดือน" value={maxContracts} onChange={setMaxContracts} placeholder="∞" />
          <NumField label="AI ครั้ง/เดือน" value={aiCalls} onChange={setAiCalls} placeholder="0" />
        </div>
      </div>

      {/* Prices */}
      <div>
        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2">ราคา (บาท)</p>
        <div className="grid grid-cols-2 gap-2">
          <NumField label="รายเดือน" value={priceMonthly} onChange={setPriceMonthly} placeholder="0" />
          <NumField label="รายปี" value={priceYearly} onChange={setPriceYearly} placeholder="0" />
        </div>
        {Number(priceYearly) > 0 && Number(priceMonthly) > 0 && (
          <p className="text-[11px] text-green-600 mt-1">
            ประหยัด {Math.round(100 - (Number(priceYearly) / (Number(priceMonthly) * 12)) * 100)}% เมื่อชำระรายปี
          </p>
        )}
      </div>

      {/* Features */}
      <div>
        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2">ฟีเจอร์ที่แสดง</p>
        <div className="space-y-1.5 mb-2">
          {features.map((f, i) => (
            <div key={i} className="flex items-center gap-1.5 group">
              <div className="flex flex-col gap-0.5">
                <button type="button" onClick={() => moveFeature(i, -1)} disabled={i === 0}
                  className="text-gray-300 hover:text-gray-500 disabled:invisible text-[10px] leading-none">▲</button>
                <button type="button" onClick={() => moveFeature(i, 1)} disabled={i === features.length - 1}
                  className="text-gray-300 hover:text-gray-500 disabled:invisible text-[10px] leading-none">▼</button>
              </div>
              <input
                value={f}
                onChange={e => setFeatures(prev => prev.map((x, idx) => idx === i ? e.target.value : x))}
                className="flex-1 text-xs px-2 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-300 bg-white"
              />
              <button type="button" onClick={() => removeFeature(i)}
                className="text-gray-300 hover:text-red-400 active:text-red-500 transition flex-shrink-0">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
        <div className="flex gap-1.5">
          <input
            value={newFeature}
            onChange={e => setNewFeature(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addFeature())}
            placeholder="เพิ่มฟีเจอร์..."
            className="flex-1 text-xs px-2 py-1.5 border border-dashed border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-300 bg-white"
          />
          <button type="button" onClick={addFeature}
            className="px-2 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg transition">
            <Plus className="w-3.5 h-3.5 text-gray-500" />
          </button>
        </div>
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      <button
        onClick={handleSave}
        disabled={saving}
        className={`w-full py-2 text-white text-sm rounded-xl transition flex items-center justify-center gap-1.5 ${
          success ? 'bg-green-500' : 'bg-blue-600 hover:bg-blue-700 disabled:opacity-60'
        }`}
      >
        <Save className="w-3.5 h-3.5" />
        {saving ? 'กำลังบันทึก…' : success ? 'บันทึกแล้ว ✓' : 'บันทึก'}
      </button>
    </div>
  )
}

function NumField({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string
}) {
  return (
    <div>
      <label className="block text-[11px] text-gray-400 mb-1">{label}</label>
      <input
        type="number" min={0} value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full text-sm px-2 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-300 bg-white"
      />
    </div>
  )
}
