'use client'

import { useState } from 'react'
import { Plus, Trash2, Loader2, Check, ChevronDown, KeyRound } from 'lucide-react'
import { saveKeyItems, type KeyItemInput } from '../actions'
import { useEditableRows } from '@/hooks/useEditableRows'

const PRESET_ITEMS: { th: string; en: string; penalty: number }[] = [
  { th: 'กุญแจห้อง',              en: 'Room Key',              penalty: 500  },
  { th: 'กุญแจห้องไปรษณีย์',      en: 'Mailbox Key',           penalty: 500  },
  { th: 'บัตรคีย์การ์ดอาคาร',     en: 'Building Keycard',      penalty: 500  },
  { th: 'บัตรคีย์การ์ดที่จอดรถ',  en: 'Parking Keycard',       penalty: 500  },
  { th: 'รีโมทแอร์',               en: 'A/C Remote Control',    penalty: 1000 },
  { th: 'รีโมทโทรทัศน์',           en: 'TV Remote Control',     penalty: 500  },
  { th: 'บัตร Digital Door Lock',  en: 'Digital Door Lock Card', penalty: 500 },
  { th: 'ตราประทับ',               en: 'Stamp',                 penalty: 200  },
  { th: 'บัตรผ่านประตู',           en: 'Access Card',           penalty: 500  },
  { th: 'บัตร EV Charger',         en: 'EV Charger Card',       penalty: 500  },
  { th: 'กุญแจตู้เซฟ',             en: 'Safe Key',              penalty: 500  },
  { th: 'กุญแจรั้ว/ประตูรั้ว',    en: 'Gate Key',              penalty: 500  },
]

interface KeyRow extends KeyItemInput {
  localId: string
}

interface Props {
  contractId: string
  initialItems?: KeyRow[]
}

function makeRow(th = '', en = '', penalty = 500): KeyRow {
  return {
    localId:        crypto.randomUUID(),
    item_name_th:   th,
    item_name_en:   en,
    quantity:       1,
    penalty_amount: penalty,
  }
}

export default function KeyHandoverChecklist({ contractId, initialItems = [] }: Props) {
  const [showPresets, setShowPresets] = useState(false)

  const { items, saved, saveError, isPending, addRow, removeRow, updateRow, handleSave } =
    useEditableRows<KeyRow, 'localId'>({
      initialItems,
      makeEmpty: makeRow,
      keyField: 'localId',
    })

  return (
    <div className="space-y-3">
      {/* Preset quick-add */}
      <div>
        <button
          type="button"
          onClick={() => setShowPresets(p => !p)}
          className="flex items-center gap-1.5 text-xs text-teal-600 hover:text-teal-800 transition font-medium"
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
                onClick={() => { addRow(makeRow(p.th, p.en, p.penalty)); setShowPresets(false) }}
                className="flex items-center gap-1 px-2.5 py-1 text-xs bg-gray-100 hover:bg-teal-50 hover:text-teal-700 rounded-full transition"
              >
                <KeyRound className="w-3 h-3 opacity-50" />
                {p.th}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Empty state */}
      {items.length === 0 && (
        <div className="text-center py-6 border border-dashed border-gray-200 rounded-xl">
          <p className="text-sm text-gray-400">ยังไม่มีรายการกุญแจและอุปกรณ์</p>
          <p className="text-xs text-gray-300 mt-1">เพิ่มจากรายการสำเร็จรูปด้านบน หรือกด "เพิ่มรายการ"</p>
        </div>
      )}

      {/* Table */}
      {items.length > 0 && (
        <div className="overflow-x-auto -mx-4 px-4">
          <table className="w-full text-sm min-w-[580px]">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 pr-3 text-xs text-gray-500 font-medium w-8">#</th>
                <th className="text-left py-2 pr-3 text-xs text-gray-500 font-medium">รายการ (ไทย)</th>
                <th className="text-left py-2 pr-3 text-xs text-gray-500 font-medium">Item (EN)</th>
                <th className="text-left py-2 pr-3 text-xs text-gray-500 font-medium w-20">จำนวน</th>
                <th className="text-left py-2 pr-3 text-xs text-gray-500 font-medium w-28">ค่าปรับ (฿)</th>
                <th className="w-8"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((row, i) => (
                <tr key={row.localId} className="group hover:bg-gray-50/50">
                  <td className="py-1.5 pr-3 text-xs text-gray-400">{i + 1}</td>
                  <td className="py-1.5 pr-3">
                    <input
                      type="text"
                      value={row.item_name_th}
                      onChange={e => updateRow(row.localId, { item_name_th: e.target.value })}
                      placeholder="ชื่อรายการ"
                      className="w-full px-2 py-1 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-teal-400"
                    />
                  </td>
                  <td className="py-1.5 pr-3">
                    <input
                      type="text"
                      value={row.item_name_en}
                      onChange={e => updateRow(row.localId, { item_name_en: e.target.value })}
                      placeholder="Item name"
                      className="w-full px-2 py-1 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-teal-400"
                    />
                  </td>
                  <td className="py-1.5 pr-3">
                    <input
                      type="number"
                      min={1}
                      value={row.quantity}
                      onChange={e => updateRow(row.localId, { quantity: parseInt(e.target.value) || 1 })}
                      className="w-full px-2 py-1 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-teal-400 text-center"
                    />
                  </td>
                  <td className="py-1.5 pr-3">
                    <input
                      type="number"
                      min={0}
                      step={100}
                      value={row.penalty_amount}
                      onChange={e => updateRow(row.localId, { penalty_amount: parseInt(e.target.value) || 0 })}
                      className="w-full px-2 py-1 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-teal-400 text-right"
                    />
                  </td>
                  <td className="py-1.5">
                    <button
                      type="button"
                      onClick={() => removeRow(row.localId)}
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
      )}

      {/* Add empty row */}
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
          onClick={() => handleSave(rows => saveKeyItems(contractId, rows.filter(r => r.item_name_th.trim()).map((r, i) => ({
            item_name_th:   r.item_name_th,
            item_name_en:   r.item_name_en,
            quantity:       r.quantity,
            penalty_amount: r.penalty_amount,
            sort_order:     i,
          }))))}
          disabled={isPending}
          className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium rounded-xl transition disabled:opacity-50"
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
