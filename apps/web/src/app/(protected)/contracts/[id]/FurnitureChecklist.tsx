'use client'

import { useState } from 'react'
import { Plus, Trash2, Loader2, Check, ChevronDown } from 'lucide-react'
import { saveFurnitureItems, type FurnitureItemInput } from '../actions'
import { useEditableRows } from '@/hooks/useEditableRows'

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
  }
}

export default function FurnitureChecklist({ contractId, initialItems = [] }: Props) {
  const [showPresets, setShowPresets] = useState(false)

  const { items, saved, saveError, isPending, addRow, removeRow, updateRow, handleSave } =
    useEditableRows<FurnitureRow, 'id'>({
      initialItems: initialItems.length > 0 ? initialItems : [makeRow()],
      makeEmpty: makeRow,
      keyField: 'id',
    })

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
          <div className="mt-2 flex flex-wrap gap-1.5">
            {PRESET_ITEMS.map(p => (
              <button
                key={p.th}
                type="button"
                onClick={() => { addRow(makeRow(p.th, p.en)); setShowPresets(false) }}
                className="px-2.5 py-1 text-xs bg-gray-100 hover:bg-blue-50 hover:text-blue-700 rounded-full transition text-left"
              >
                <span>{p.th}</span>
                <span className="text-gray-400 ml-1">/ {p.en}</span>
              </button>
            ))}
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

      {/* Add row */}
      <button
        type="button"
        onClick={() => addRow()}
        className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 transition"
      >
        <Plus className="w-3.5 h-3.5" />
        เพิ่มรายการ
      </button>

      {/* Save */}
      <div className="flex items-center gap-3 pt-1">
        <button
          type="button"
          onClick={() => handleSave(rows => saveFurnitureItems(contractId, rows.filter(r => r.item_name.trim()).map((r, i) => ({
            item_name:    r.item_name,
            item_name_en: r.item_name_en || null,
            quantity:     r.quantity,
            condition:    r.condition,
            notes:        r.notes || null,
            serial_no:    r.serial_no || null,
            sort_order:   i,
          }))))}
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
