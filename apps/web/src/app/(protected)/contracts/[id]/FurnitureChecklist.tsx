'use client'

import { useState, useEffect, useMemo, useTransition } from 'react'
import { Plus, Trash2, Loader2, Check, ChevronDown, Search, X, Sparkles } from 'lucide-react'
import { saveFurnitureItems, translateFurnitureNames, type FurnitureItemInput } from '../actions'
import { useEditableRows } from '@/hooks/useEditableRows'

const FURNITURE_PRESETS_KEY = 'proppsy_furniture_presets'

const PRESET_ITEMS: Array<{ th: string; en: string }> = [
  { th: 'เตียง',              en: 'Bed' },
  { th: 'ที่นอน',             en: 'Mattress' },
  { th: 'ตู้เสื้อผ้า',        en: 'Wardrobe' },
  { th: 'โซฟา',               en: 'Sofa' },
  { th: 'โทรทัศน์',           en: 'Television' },
  { th: 'ตู้เย็น',            en: 'Refrigerator' },
  { th: 'เครื่องซักผ้า',      en: 'Washing Machine' },
  { th: 'ไมโครเวฟ',           en: 'Microwave' },
  { th: 'แอร์',               en: 'Air Conditioner' },
  { th: 'โต๊ะ',               en: 'Table' },
  { th: 'เก้าอี้',            en: 'Chair' },
  { th: 'ชั้นวางของ',         en: 'Shelf' },
  { th: 'ม่าน',               en: 'Curtains' },
  { th: 'พัดลม',              en: 'Fan' },
  { th: 'เครื่องทำน้ำอุ่น',   en: 'Water Heater' },
  { th: 'โต๊ะทานข้าว',        en: 'Dining Table' },
  { th: 'ตู้ครัว',            en: 'Kitchen Cabinet' },
  { th: 'เตาไฟฟ้า',           en: 'Electric Stove' },
]

const CONDITION_LABELS: Record<string, { label: string; color: string }> = {
  good:    { label: 'ดี / Good',       color: 'text-green-600 bg-green-50 border-green-200' },
  fair:    { label: 'พอใช้ / Fair',    color: 'text-yellow-600 bg-yellow-50 border-yellow-200' },
  damaged: { label: 'ชำรุด / Damaged', color: 'text-red-600 bg-red-50 border-red-200' },
  missing: { label: 'ไม่มี / Missing', color: 'text-gray-600 bg-gray-50 border-gray-200' },
}

interface FurnitureRow extends FurnitureItemInput {
  id: string
}

interface Props {
  contractId: string
  initialItems?: FurnitureRow[]
  /** Move-out inspection mode: record exit condition vs. the move-in snapshot. */
  moveOut?: boolean
}

const MOVE_OUT_OPTIONS: Record<string, string> = {
  '':        '— เลือกสภาพ —',
  good:      'ปกติ / Good',
  fair:      'เสื่อมสภาพ / Fair',
  damaged:   'ชำรุด / Damaged',
  missing:   'สูญหาย / Missing',
}

function makeRow(th = '', en = ''): FurnitureRow {
  return {
    id: crypto.randomUUID(),
    item_name: th,
    item_name_en: en,
    quantity: 1,
    condition: 'good',
    notes: '',
    serial_no: '',
    move_out_condition: '',
    move_out_notes: '',
  }
}

export default function FurnitureChecklist({ contractId, initialItems = [], moveOut = false }: Props) {
  const [showPresets, setShowPresets] = useState(false)

  const { items, saved, saveError, isPending, addRow, removeRow, updateRow, handleSave } =
    useEditableRows<FurnitureRow, 'id'>({
      initialItems: initialItems.length > 0 ? initialItems : [makeRow()],
      makeEmpty: makeRow,
      keyField: 'id',
    })

  function saveAll(rows: FurnitureRow[]) {
    return saveFurnitureItems(contractId, rows.filter(r => r.item_name.trim()).map((r, i) => ({
      item_name:    r.item_name,
      item_name_en: r.item_name_en || null,
      quantity:     r.quantity,
      condition:    r.condition,
      notes:        r.notes || null,
      serial_no:    r.serial_no || null,
      sort_order:   i,
      move_out_condition: r.move_out_condition || null,
      move_out_notes:     r.move_out_notes || null,
    })))
  }

  // ── Saved custom presets (localStorage, per device) ──────────
  const [presetSearch, setPresetSearch] = useState('')
  const [customPresets, setCustomPresets] = useState<{ th: string; en: string }[]>([])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(FURNITURE_PRESETS_KEY)
      if (raw) setCustomPresets(JSON.parse(raw))
    } catch { /* ignore */ }
  }, [])

  // Built-in presets first, then the agent's saved customs (deduped by Thai name)
  const allPresets = useMemo(() => {
    const seen = new Set(PRESET_ITEMS.map(p => p.th.trim().toLowerCase()))
    const merged = PRESET_ITEMS.map(p => ({ ...p, custom: false }))
    for (const c of customPresets) {
      const k = c.th.trim().toLowerCase()
      if (k && !seen.has(k)) { seen.add(k); merged.push({ th: c.th, en: c.en, custom: true }) }
    }
    return merged
  }, [customPresets])

  const filteredPresets = useMemo(() => {
    const q = presetSearch.trim().toLowerCase()
    if (!q) return allPresets
    return allPresets.filter(p => p.th.toLowerCase().includes(q) || (p.en ?? '').toLowerCase().includes(q))
  }, [allPresets, presetSearch])

  const addedNames = new Set(items.map(it => it.item_name.trim().toLowerCase()))

  // Click a preset to add it; click again (while highlighted) to remove it.
  function togglePreset(th: string, en: string) {
    const key = th.trim().toLowerCase()
    const existing = items.filter(it => it.item_name.trim().toLowerCase() === key)
    if (existing.length > 0) existing.forEach(r => removeRow(r.id))
    else addRow(makeRow(th, en))
  }

  function removeCustomPreset(th: string) {
    const next = customPresets.filter(c => c.th.trim().toLowerCase() !== th.trim().toLowerCase())
    setCustomPresets(next)
    try { localStorage.setItem(FURNITURE_PRESETS_KEY, JSON.stringify(next)) } catch { /* ignore */ }
  }

  // AI translate: fill blank English names from the Thai names (1 AI use).
  const [isTranslating, startTranslate] = useTransition()
  const [translateMsg, setTranslateMsg] = useState('')
  function handleTranslate() {
    const targets = items.filter(r => r.item_name.trim() && !(r.item_name_en ?? '').trim())
    if (targets.length === 0) { setTranslateMsg('ไม่มีรายการที่ต้องแปล'); return }
    setTranslateMsg('')
    startTranslate(async () => {
      const res = await translateFurnitureNames(targets.map(r => r.item_name))
      if (res.error) { setTranslateMsg(res.error); return }
      const translations = res.translations ?? []
      targets.forEach((r, i) => {
        const en = translations[i]?.trim()
        if (en) updateRow(r.id, { item_name_en: en })
      })
      setTranslateMsg(res.quota ? `แปลแล้ว · AI ${res.quota.used}/${res.quota.limit}` : 'แปลแล้ว ✓')
    })
  }

  // On save, remember any newly typed item names for next time.
  function persistNewPresets(rows: FurnitureRow[]) {
    const existing = new Set(allPresets.map(p => p.th.trim().toLowerCase()))
    const additions: { th: string; en: string }[] = []
    for (const r of rows) {
      const th = r.item_name.trim()
      if (!th) continue
      const k = th.toLowerCase()
      if (!existing.has(k)) { existing.add(k); additions.push({ th, en: (r.item_name_en ?? '').trim() }) }
    }
    if (additions.length) {
      const next = [...customPresets, ...additions]
      setCustomPresets(next)
      try { localStorage.setItem(FURNITURE_PRESETS_KEY, JSON.stringify(next)) } catch { /* ignore */ }
    }
  }

  // ── Move-out inspection mode (compares against the move-in snapshot) ──
  if (moveOut) {
    return (
      <div className="space-y-3">
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          ตรวจสภาพทรัพย์สินตอนผู้เช่าย้ายออก — “สภาพเข้าอยู่” คือสภาพตอนเริ่มสัญญา (อ้างอิง) กรอก “สภาพขาออก” และหมายเหตุของแต่ละรายการ
        </p>
        <div className="overflow-x-auto -mx-4 px-4">
          <table className="w-full text-sm min-w-[720px]">
            <thead>
              <tr className="border-b border-gray-200 text-xs text-gray-500">
                <th className="text-left py-2 pr-2 font-medium w-7">#</th>
                <th className="text-left py-2 pr-2 font-medium">รายการ</th>
                <th className="text-left py-2 pr-2 font-medium w-14">จำนวน</th>
                <th className="text-left py-2 pr-2 font-medium w-28">สภาพเข้าอยู่</th>
                <th className="text-left py-2 pr-2 font-medium w-36">สภาพขาออก</th>
                <th className="text-left py-2 font-medium">หมายเหตุขาออก</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((row, i) => (
                <tr key={row.id} className="hover:bg-gray-50/50">
                  <td className="py-2 pr-2 text-xs text-gray-400">{i + 1}</td>
                  <td className="py-2 pr-2">
                    <p className="text-gray-800">{row.item_name}</p>
                    {row.item_name_en && <p className="text-xs text-gray-400">{row.item_name_en}</p>}
                  </td>
                  <td className="py-2 pr-2 text-center text-gray-600">{row.quantity}</td>
                  <td className="py-2 pr-2">
                    <span className={`inline-block px-2 py-0.5 rounded-md text-xs font-medium border ${CONDITION_LABELS[row.condition]?.color ?? 'text-gray-500 bg-gray-50 border-gray-200'}`}>
                      {CONDITION_LABELS[row.condition]?.label ?? row.condition}
                    </span>
                  </td>
                  <td className="py-2 pr-2">
                    <select
                      value={row.move_out_condition ?? ''}
                      onChange={e => updateRow(row.id, { move_out_condition: e.target.value })}
                      className="w-full px-2 py-1 border border-gray-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-400"
                    >
                      {Object.entries(MOVE_OUT_OPTIONS).map(([v, label]) => (
                        <option key={v} value={v}>{label}</option>
                      ))}
                    </select>
                  </td>
                  <td className="py-2">
                    <input
                      type="text"
                      value={row.move_out_notes ?? ''}
                      onChange={e => updateRow(row.id, { move_out_notes: e.target.value })}
                      placeholder="เช่น มีรอยขีดข่วน, ใช้งานได้ปกติ"
                      className="w-full px-2 py-1 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                    />
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr><td colSpan={6} className="py-6 text-center text-gray-400 text-sm">ไม่มีรายการทรัพย์สินจากสัญญาเช่า</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center gap-3 pt-1">
          <button
            type="button"
            onClick={() => handleSave(saveAll)}
            disabled={isPending}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition disabled:opacity-50"
          >
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            {isPending ? 'กำลังบันทึก...' : 'บันทึกผลตรวจขาออก'}
          </button>
          {saved     && <span className="text-xs text-green-600 font-medium">บันทึกแล้ว ✓</span>}
          {saveError && <span className="text-xs text-red-600">{saveError}</span>}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Preset quick-add */}
      <div>
        <button
          type="button"
          onClick={() => setShowPresets(p => !p)}
          className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 transition font-medium"
        >
          <Plus className="w-3.5 h-3.5" />
          เพิ่มจากรายการสำเร็จรูป
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showPresets ? 'rotate-180' : ''}`} />
        </button>
        {showPresets && (
          <div className="mt-2 p-2.5 bg-gray-50 border border-gray-200 rounded-xl space-y-2">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={presetSearch}
                  onChange={e => setPresetSearch(e.target.value)}
                  placeholder="ค้นหา / พิมพ์ชื่อเฟอร์นิเจอร์..."
                  className="w-full pl-8 pr-2 py-1.5 border border-gray-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
                />
              </div>
              <button
                type="button"
                onClick={() => { setShowPresets(false); setPresetSearch('') }}
                className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex-shrink-0"
              >
                เสร็จ
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-44 overflow-y-auto">
              {filteredPresets.map(p => {
                const added = addedNames.has(p.th.trim().toLowerCase())
                return (
                  <span
                    key={p.th}
                    className={`inline-flex items-center rounded-full text-xs transition border ${
                      added ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-white border-gray-200 hover:bg-blue-50 hover:text-blue-700'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => togglePreset(p.th, p.en)}
                      className="pl-2.5 pr-1.5 py-1 flex items-center gap-1"
                    >
                      {added && <Check className="w-3 h-3" />}
                      <span>{p.th}</span>
                      {p.en && <span className="text-gray-400">/ {p.en}</span>}
                    </button>
                    {p.custom && (
                      <button
                        type="button"
                        onClick={() => removeCustomPreset(p.th)}
                        title="ลบออกจากคลัง"
                        className="pr-2 pl-0.5 text-gray-300 hover:text-red-500"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </span>
                )
              })}
              {filteredPresets.length === 0 && (
                <p className="text-xs text-gray-400 py-1">ไม่พบ — พิมพ์ชื่อในตารางด้านล่างแล้วกดบันทึก ระบบจะจำไว้ให้</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto -mx-4 px-4">
        <table className="w-full text-sm min-w-[760px]">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-2 pr-2 text-xs text-gray-500 font-medium w-7">#</th>
              <th className="text-left py-2 pr-2 text-xs text-gray-500 font-medium">ชื่อ (ไทย)</th>
              <th className="text-left py-2 pr-2 text-xs text-gray-500 font-medium">Name (English)</th>
              <th className="text-left py-2 pr-2 text-xs text-gray-500 font-medium w-16">จำนวน</th>
              <th className="text-left py-2 pr-2 text-xs text-gray-500 font-medium w-32">สภาพ</th>
              <th className="text-left py-2 pr-2 text-xs text-gray-500 font-medium">หมายเหตุ</th>
              <th className="text-left py-2 text-xs text-gray-500 font-medium w-7"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.map((row, i) => (
              <tr key={row.id} className="group hover:bg-gray-50/50">
                <td className="py-1.5 pr-2 text-xs text-gray-400">{i + 1}</td>
                <td className="py-1.5 pr-2">
                  <input
                    type="text"
                    value={row.item_name}
                    onChange={e => updateRow(row.id, { item_name: e.target.value })}
                    placeholder="ชื่อภาษาไทย"
                    className="w-full px-2 py-1 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                  />
                </td>
                <td className="py-1.5 pr-2">
                  <input
                    type="text"
                    value={row.item_name_en ?? ''}
                    onChange={e => updateRow(row.id, { item_name_en: e.target.value })}
                    placeholder="English name"
                    className="w-full px-2 py-1 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                  />
                </td>
                <td className="py-1.5 pr-2">
                  <input
                    type="number"
                    min={1}
                    value={row.quantity === 0 ? '' : row.quantity}
                    onChange={e => {
                      const v = e.target.value
                      if (v === '') { updateRow(row.id, { quantity: 0 }); return }
                      const n = parseInt(v)
                      if (!Number.isNaN(n)) updateRow(row.id, { quantity: n })
                    }}
                    onBlur={() => { if (!row.quantity || row.quantity < 1) updateRow(row.id, { quantity: 1 }) }}
                    className="w-full px-2 py-1 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-400 text-center"
                  />
                </td>
                <td className="py-1.5 pr-2">
                  <select
                    value={row.condition}
                    onChange={e => updateRow(row.id, { condition: e.target.value as FurnitureRow['condition'] })}
                    className={`w-full px-2 py-1 border rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-400 ${CONDITION_LABELS[row.condition]?.color ?? ''}`}
                  >
                    {Object.entries(CONDITION_LABELS).map(([v, { label }]) => (
                      <option key={v} value={v}>{label}</option>
                    ))}
                  </select>
                </td>
                <td className="py-1.5 pr-2">
                  <input
                    type="text"
                    value={row.notes ?? ''}
                    onChange={e => updateRow(row.id, { notes: e.target.value })}
                    placeholder="หมายเหตุ"
                    className="w-full px-2 py-1 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                  />
                </td>
                <td className="py-1.5">
                  <button
                    type="button"
                    onClick={() => removeRow(row.id)}
                    className="p-1 text-gray-300 hover:text-red-500 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add row + AI translate */}
      <div className="flex items-center gap-4 flex-wrap">
        <button
          type="button"
          onClick={() => addRow()}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 transition"
        >
          <Plus className="w-3.5 h-3.5" />
          เพิ่มรายการ
        </button>
        <button
          type="button"
          onClick={handleTranslate}
          disabled={isTranslating}
          className="flex items-center gap-1.5 text-xs text-violet-600 hover:text-violet-800 transition disabled:opacity-50"
        >
          {isTranslating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
          {isTranslating ? 'กำลังแปล...' : 'เติมภาษาอังกฤษด้วย AI'}
        </button>
        {translateMsg && <span className="text-xs text-gray-500">{translateMsg}</span>}
      </div>

      {/* Save */}
      <div className="flex items-center gap-3 pt-1">
        <button
          type="button"
          onClick={() => { persistNewPresets(items); handleSave(saveAll) }}
          disabled={isPending}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition disabled:opacity-50"
        >
          {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          {isPending ? 'กำลังบันทึก...' : 'บันทึกรายการ'}
        </button>
        {saved     && <span className="text-xs text-green-600 font-medium">บันทึกแล้ว ✓</span>}
        {saveError && <span className="text-xs text-red-600">{saveError}</span>}
      </div>
    </div>
  )
}
