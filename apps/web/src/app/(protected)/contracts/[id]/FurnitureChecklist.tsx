'use client'

import { useState } from 'react'
import { Plus, Trash2, Loader2, Check, ChevronDown } from 'lucide-react'
import { saveFurnitureItems, type FurnitureItemInput } from '../actions'
import { useEditableRows } from '@/hooks/useEditableRows'

// Common furniture presets for quick-add
const PRESET_ITEMS = [
  'เตียง', 'ที่นอน', 'ตู้เสื้อผ้า', 'โซฟา', 'โทรทัศน์', 'ตู้เย็น',
  'เครื่องซักผ้า', 'ไมโครเวฟ', 'แอร์', 'โต๊ะ', 'เก้าอี้', 'ชั้นวางของ',
  'ม่าน', 'พัดลม', 'เครื่องทำน้ำอุ่น', 'โต๊ะทานข้าว', 'ตู้ครัว', 'เตาไฟฟ้า',
]

const CONDITION_LABELS: Record<string, { label: string; color: string }> = {
  good:    { label: 'สภาพดี',     color: 'text-green-600 bg-green-50 border-green-200' },
  fair:    { label: 'พอใช้',      color: 'text-yellow-600 bg-yellow-50 border-yellow-200' },
  damaged: { label: 'ชำรุด',      color: 'text-red-600 bg-red-50 border-red-200' },
  missing: { label: 'ไม่มี/สูญหาย', color: 'text-gray-600 bg-gray-50 border-gray-200' },
}

interface FurnitureRow extends FurnitureItemInput {
  id: string
}

interface Props {
  contractId: string
  initialItems?: FurnitureRow[]
}

function makeRow(name = ''): FurnitureRow {
  return {
    id: crypto.randomUUID(),
    item_name: name,
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
                key={p}
                type="button"
                onClick={() => { addRow(makeRow(p)); setShowPresets(false) }}
                className="px-2.5 py-1 text-xs bg-gray-100 hover:bg-blue-50 hover:text-blue-700 rounded-full transition"
              >
                {p}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto -mx-4 px-4">
        <table className="w-full text-sm min-w-[640px]">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-2 pr-3 text-xs text-gray-500 font-medium w-8">#</th>
              <th className="text-left py-2 pr-3 text-xs text-gray-500 font-medium">รายการ</th>
              <th className="text-left py-2 pr-3 text-xs text-gray-500 font-medium w-20">จำนวน</th>
              <th className="text-left py-2 pr-3 text-xs text-gray-500 font-medium w-32">สภาพ</th>
              <th className="text-left py-2 pr-3 text-xs text-gray-500 font-medium">หมายเหตุ</th>
              <th className="text-left py-2 text-xs text-gray-500 font-medium w-8"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.map((row, i) => (
              <tr key={row.id} className="group hover:bg-gray-50/50">
                <td className="py-1.5 pr-3 text-xs text-gray-400">{i + 1}</td>
                <td className="py-1.5 pr-3">
                  <input
                    type="text"
                    value={row.item_name}
                    onChange={e => updateRow(row.id, { item_name: e.target.value })}
                    placeholder="ชื่อรายการ"
                    className="w-full px-2 py-1 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                  />
                </td>
                <td className="py-1.5 pr-3">
                  <input
                    type="number"
                    min={1}
                    value={row.quantity}
                    onChange={e => updateRow(row.id, { quantity: parseInt(e.target.value) || 1 })}
                    className="w-full px-2 py-1 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-400 text-center"
                  />
                </td>
                <td className="py-1.5 pr-3">
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
                <td className="py-1.5 pr-3">
                  <input
                    type="text"
                    value={row.notes ?? ''}
                    onChange={e => updateRow(row.id, { notes: e.target.value })}
                    placeholder="หมายเหตุ (ไม่บังคับ)"
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
            item_name:  r.item_name,
            quantity:   r.quantity,
            condition:  r.condition,
            notes:      r.notes || null,
            serial_no:  r.serial_no || null,
            sort_order: i,
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
