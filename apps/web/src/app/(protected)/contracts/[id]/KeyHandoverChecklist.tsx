'use client'

import { useState, useEffect, useMemo, useTransition } from 'react'
import { Plus, Trash2, Loader2, Check, ChevronDown, KeyRound, Search, X, Sparkles } from 'lucide-react'
import { saveKeyItems, translateFurnitureNames, type KeyItemInput } from '../actions'
import { useEditableRows } from '@/hooks/useEditableRows'

const KEY_PRESETS_KEY = 'proppsy_key_presets'

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

  function saveAll(rows: KeyRow[]) {
    return saveKeyItems(contractId, rows.filter(r => r.item_name_th.trim()).map((r, i) => ({
      item_name_th:   r.item_name_th,
      item_name_en:   r.item_name_en,
      quantity:       r.quantity,
      penalty_amount: r.penalty_amount,
      sort_order:     i,
    })))
  }

  // ── Saved custom presets (localStorage, per device) ──────────
  const [presetSearch, setPresetSearch] = useState('')
  const [customPresets, setCustomPresets] = useState<{ th: string; en: string; penalty: number }[]>([])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY_PRESETS_KEY)
      if (raw) setCustomPresets(JSON.parse(raw))
    } catch { /* ignore */ }
  }, [])

  const allPresets = useMemo(() => {
    const seen = new Set(PRESET_ITEMS.map(p => p.th.trim().toLowerCase()))
    const merged = PRESET_ITEMS.map(p => ({ ...p, custom: false }))
    for (const c of customPresets) {
      const k = c.th.trim().toLowerCase()
      if (k && !seen.has(k)) { seen.add(k); merged.push({ th: c.th, en: c.en, penalty: c.penalty ?? 500, custom: true }) }
    }
    return merged
  }, [customPresets])

  const filteredPresets = useMemo(() => {
    const q = presetSearch.trim().toLowerCase()
    if (!q) return allPresets
    return allPresets.filter(p => p.th.toLowerCase().includes(q) || (p.en ?? '').toLowerCase().includes(q))
  }, [allPresets, presetSearch])

  const addedNames = new Set(items.map(it => it.item_name_th.trim().toLowerCase()))

  // Click a preset to add it; click again (while highlighted) to remove it.
  function togglePreset(th: string, en: string, penalty: number) {
    const key = th.trim().toLowerCase()
    const existing = items.filter(it => it.item_name_th.trim().toLowerCase() === key)
    if (existing.length > 0) existing.forEach(r => removeRow(r.localId))
    else addRow(makeRow(th, en, penalty))
  }

  function removeCustomPreset(th: string) {
    const next = customPresets.filter(c => c.th.trim().toLowerCase() !== th.trim().toLowerCase())
    setCustomPresets(next)
    try { localStorage.setItem(KEY_PRESETS_KEY, JSON.stringify(next)) } catch { /* ignore */ }
  }

  function persistNewPresets(rows: KeyRow[]) {
    const existing = new Set(allPresets.map(p => p.th.trim().toLowerCase()))
    const additions: { th: string; en: string; penalty: number }[] = []
    for (const r of rows) {
      const th = r.item_name_th.trim()
      if (!th) continue
      const k = th.toLowerCase()
      if (!existing.has(k)) { existing.add(k); additions.push({ th, en: (r.item_name_en ?? '').trim(), penalty: r.penalty_amount ?? 500 }) }
    }
    if (additions.length) {
      const next = [...customPresets, ...additions]
      setCustomPresets(next)
      try { localStorage.setItem(KEY_PRESETS_KEY, JSON.stringify(next)) } catch { /* ignore */ }
    }
  }

  // AI translate: fill blank English names from the Thai names (1 AI use).
  const [isTranslating, startTranslate] = useTransition()
  const [translateMsg, setTranslateMsg] = useState('')
  function handleTranslate() {
    const targets = items.filter(r => r.item_name_th.trim() && !(r.item_name_en ?? '').trim())
    if (targets.length === 0) { setTranslateMsg('ไม่มีรายการที่ต้องแปล'); return }
    setTranslateMsg('')
    startTranslate(async () => {
      const res = await translateFurnitureNames(targets.map(r => r.item_name_th))
      if (res.error) { setTranslateMsg(res.error); return }
      const translations = res.translations ?? []
      targets.forEach((r, i) => {
        const en = translations[i]?.trim()
        if (en) updateRow(r.localId, { item_name_en: en })
      })
      setTranslateMsg(res.quota ? `แปลแล้ว · AI ${res.quota.used}/${res.quota.limit}` : 'แปลแล้ว ✓')
    })
  }

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
          <div className="mt-2 p-2.5 bg-gray-50 border border-gray-200 rounded-xl space-y-2">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={presetSearch}
                  onChange={e => setPresetSearch(e.target.value)}
                  placeholder="ค้นหา / พิมพ์ชื่อรายการ..."
                  className="w-full pl-8 pr-2 py-1.5 border border-gray-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-teal-400"
                />
              </div>
              <button
                type="button"
                onClick={() => { setShowPresets(false); setPresetSearch('') }}
                className="px-3 py-1.5 text-xs bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition flex-shrink-0"
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
                      added ? 'bg-teal-50 border-teal-300 text-teal-700' : 'bg-white border-gray-200 hover:bg-teal-50 hover:text-teal-700'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => togglePreset(p.th, p.en, p.penalty)}
                      className="pl-2.5 pr-1.5 py-1 flex items-center gap-1"
                    >
                      {added ? <Check className="w-3 h-3" /> : <KeyRound className="w-3 h-3 opacity-50" />}
                      <span>{p.th}</span>
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
