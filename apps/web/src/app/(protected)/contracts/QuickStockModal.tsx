'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { X, Loader2, Home, ChevronDown, Plus } from 'lucide-react'
import { createStock } from '@/app/(protected)/stock/actions'
import { searchProjects } from './search-actions'
import QuickProjectModal from '@/app/(protected)/stock/QuickProjectModal'

// ─── Types ───────────────────────────────────────────────────

interface Props {
  onCreated: (id: string, label: string) => void
  onClose: () => void
}

type ListingType = 'rent' | 'sale' | 'both'

const ROOM_TYPES = [
  { value: 'สตูดิโอ / Studio', label: 'สตูดิโอ / Studio' },
  { value: '1 ห้องนอน / 1 Bedroom', label: '1 ห้องนอน / 1 Bedroom' },
  { value: '2 ห้องนอน / 2 Bedrooms', label: '2 ห้องนอน / 2 Bedrooms' },
  { value: '3 ห้องนอน / 3 Bedrooms', label: '3 ห้องนอน / 3 Bedrooms' },
  { value: 'เพนต์เฮาส์ / Penthouse', label: 'เพนต์เฮาส์ / Penthouse' },
]
const CUSTOM_ROOM_TYPES_KEY = 'proppsy_custom_room_types'

const INPUT = 'w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition bg-white'

// ─── Simple Combobox ──────────────────────────────────────────

function SearchCombobox<T extends { id: string }>({
  placeholder,
  selectedId,
  selectedLabel,
  onSelect,
  onClear,
  searchFn,
  renderResult,
}: {
  placeholder: string
  selectedId: string
  selectedLabel: string
  onSelect: (item: T) => void
  onClear: () => void
  searchFn: (q: string) => Promise<T[]>
  renderResult: (item: T) => React.ReactNode
}) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<T[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    if (!open) return
    setLoading(true)
    searchFn(query).then(r => { setResults(r); setLoading(false) })
  }, [query, open]) // eslint-disable-line react-hooks/exhaustive-deps

  if (selectedId) {
    return (
      <div className="flex items-center gap-2 px-3 py-2.5 border border-blue-300 bg-blue-50 rounded-xl text-sm">
        <span className="flex-1 text-blue-800 font-medium truncate">{selectedLabel}</span>
        <button type="button" onClick={onClear} className="text-blue-400 hover:text-blue-600 flex-shrink-0">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    )
  }

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className={INPUT}
        />
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
      </div>
      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
          {loading ? (
            <div className="flex items-center gap-2 px-3 py-3 text-xs text-gray-400">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> กำลังค้นหา...
            </div>
          ) : results.length === 0 ? (
            <p className="px-3 py-3 text-xs text-gray-400">ไม่พบผลลัพธ์</p>
          ) : (
            results.map(item => (
              <button
                key={item.id}
                type="button"
                onClick={() => { onSelect(item); setOpen(false); setQuery('') }}
                className="w-full text-left px-3 py-2.5 hover:bg-blue-50 text-sm transition"
              >
                {renderResult(item)}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main Modal ───────────────────────────────────────────────

export default function QuickStockModal({ onCreated, onClose }: Props) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')

  // Project
  const [projectId, setProjectId] = useState('')
  const [projectName, setProjectName] = useState('')
  const [showQuickProject, setShowQuickProject] = useState(false)

  // Stock fields
  const [unitNo, setUnitNo] = useState('')
  const [roomType, setRoomType] = useState('')
  const [floor, setFloor] = useState('')
  const [sizeSqm, setSizeSqm] = useState('')
  const [listingType, setListingType] = useState<ListingType>('rent')
  const [rentPrice, setRentPrice] = useState('')
  const [salePrice, setSalePrice] = useState('')
  const [deposit, setDeposit] = useState('')
  const [customRoomTypes, setCustomRoomTypes] = useState<string[]>([])
  const [addingRoomType, setAddingRoomType] = useState(false)
  const [newRoomTypeText, setNewRoomTypeText] = useState('')

  useEffect(() => {
    try {
      const raw = localStorage.getItem(CUSTOM_ROOM_TYPES_KEY)
      if (raw) setCustomRoomTypes(JSON.parse(raw))
    } catch { /* ignore */ }
  }, [])

  function handleAddCustomRoomType() {
    const val = newRoomTypeText.trim()
    if (!val) { setAddingRoomType(false); return }
    setCustomRoomTypes(prev => {
      if (prev.includes(val) || ROOM_TYPES.some(r => r.value === val)) return prev
      const next = [...prev, val]
      try { localStorage.setItem(CUSTOM_ROOM_TYPES_KEY, JSON.stringify(next)) } catch { /* ignore */ }
      return next
    })
    setRoomType(val)
    setNewRoomTypeText('')
    setAddingRoomType(false)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const errs: string[] = []
    if (!projectId) errs.push('กรุณาเลือกโครงการ หรือกด "+ สร้างใหม่"')
    if (!roomType) errs.push('กรุณาเลือกประเภทห้อง')
    if (!floor.trim()) errs.push('กรุณาระบุชั้น')
    if (!sizeSqm.trim()) errs.push('กรุณาระบุขนาดห้อง')
    if ((listingType === 'rent' || listingType === 'both') && !rentPrice.trim()) errs.push('กรุณาระบุราคาเช่า')
    if ((listingType === 'sale' || listingType === 'both') && !salePrice.trim()) errs.push('กรุณาระบุราคาขาย')
    if (errs.length) { setError(errs[0] ?? ''); return }

    setError('')
    startTransition(async () => {
      const res = await createStock({
        project_name: projectName.trim(),
        project_id: projectId || null,
        owner_id: null,
        unit_no: unitNo.trim() || undefined,
        room_type: roomType || undefined,
        floor: floor.trim() || undefined,
        size_sqm: sizeSqm ? parseFloat(sizeSqm) : undefined,
        listing_type: listingType,
        rent_price: rentPrice ? parseInt(rentPrice) : undefined,
        sale_price: salePrice ? parseInt(salePrice) : undefined,
        deposit: deposit ? parseInt(deposit) : 0,
        contract_term: 12,
        furniture: [],
        facilities: [],
        status: 'available',
        photo_urls: [],
        photo_thumb_urls: [],
        is_published: false,
      } as Parameters<typeof createStock>[0])

      if (res.error) { setError(res.error); return }

      const label = [projectName.trim(), unitNo.trim(), roomType].filter(Boolean).join(' · ')
      onCreated(res.id!, label)
    })
  }

  return (
    <>
      <div className="fixed inset-0 z-[9998] flex items-end sm:items-center justify-center">
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
        <div className="relative bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg shadow-2xl z-10 max-h-[90dvh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100 flex-shrink-0">
            <div className="flex items-center gap-2">
              <Home className="w-4 h-4 text-blue-600" />
              <h3 className="text-base font-bold text-gray-900">เพิ่มทรัพย์ใหม่</h3>
            </div>
            <button type="button" onClick={onClose} className="p-1.5 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 px-5 py-4 space-y-4">

            {/* โครงการ */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                โครงการ <span className="text-red-400">*</span>
              </label>
              <div className="flex gap-2">
                <div className="flex-1">
                  <SearchCombobox
                    placeholder="ค้นหาโครงการ..."
                    selectedId={projectId}
                    selectedLabel={projectName}
                    onSelect={(item: { id: string; name_th: string; name_en?: string | null }) => {
                      setProjectId(item.id)
                      setProjectName(item.name_en || item.name_th)
                    }}
                    onClear={() => { setProjectId(''); setProjectName('') }}
                    searchFn={searchProjects}
                    renderResult={(item: { id: string; name_th: string; name_en?: string | null; district?: string | null; province?: string | null }) => (
                      <span>
                        <span className="font-medium text-gray-800">{item.name_en || item.name_th}</span>
                        {(item.district || item.province) && (
                          <span className="text-xs text-gray-400 ml-1">· {[item.district, item.province].filter(Boolean).join(' ')}</span>
                        )}
                        {item.name_en && item.name_th !== item.name_en && (
                          <span className="block text-xs text-gray-400 mt-0.5">{item.name_th}</span>
                        )}
                      </span>
                    )}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setShowQuickProject(true)}
                  className="flex-shrink-0 flex items-center gap-1 px-3 py-2.5 border border-gray-200 rounded-xl text-xs text-gray-600 hover:bg-gray-50 transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  สร้างใหม่
                </button>
              </div>
            </div>

            {/* ประเภทห้อง */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                ประเภทห้อง <span className="text-red-400">*</span>
              </label>
              {addingRoomType ? (
                <div className="flex gap-2">
                  <input
                    autoFocus
                    value={newRoomTypeText}
                    onChange={e => setNewRoomTypeText(e.target.value)}
                    placeholder="เช่น Duplex / ดูเพล็กซ์"
                    className={INPUT}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddCustomRoomType() } }}
                  />
                  <button type="button" onClick={handleAddCustomRoomType} className="px-3 rounded-xl bg-blue-600 text-white text-sm font-medium shrink-0">เพิ่ม</button>
                  <button type="button" onClick={() => { setAddingRoomType(false); setNewRoomTypeText('') }} className="px-3 rounded-xl border border-gray-200 text-gray-500 text-sm shrink-0">ยกเลิก</button>
                </div>
              ) : (
                <div className="flex gap-2 flex-wrap">
                  {ROOM_TYPES.map(r => (
                    <button
                      key={r.value}
                      type="button"
                      onClick={() => setRoomType(r.value === roomType ? '' : r.value)}
                      className={`px-3 py-1.5 text-xs rounded-lg border transition ${roomType === r.value ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 text-gray-700 hover:bg-gray-50'}`}
                    >{r.label}</button>
                  ))}
                  {customRoomTypes.map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setRoomType(t === roomType ? '' : t)}
                      className={`px-3 py-1.5 text-xs rounded-lg border transition ${roomType === t ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 text-gray-700 hover:bg-gray-50'}`}
                    >{t}</button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setAddingRoomType(true)}
                    className="px-3 py-1.5 text-xs rounded-lg border border-dashed border-gray-300 text-gray-500 hover:bg-gray-50 transition"
                  >+ เพิ่มประเภทใหม่</button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">เลขห้อง / ยูนิต</label>
                <input value={unitNo} onChange={e => setUnitNo(e.target.value)} placeholder="เช่น 12A, 305" className={INPUT} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">
                  ชั้น <span className="text-red-400">*</span>
                </label>
                <input value={floor} onChange={e => setFloor(e.target.value)} placeholder="เช่น 12 หรือ 12A" className={INPUT} />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1.5">
                  ขนาด (ตร.ม.) <span className="text-red-400">*</span>
                </label>
                <input value={sizeSqm} onChange={e => setSizeSqm(e.target.value)} placeholder="เช่น 35.5" className={INPUT} inputMode="decimal" />
              </div>
            </div>

            {/* ประเภทการลงประกาศ */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">ประเภทการลงประกาศ</label>
              <div className="flex gap-2">
                {(['rent', 'sale', 'both'] as ListingType[]).map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setListingType(t)}
                    className={`flex-1 py-2 text-sm rounded-xl border transition ${listingType === t ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 text-gray-700 hover:bg-gray-50'}`}
                  >
                    {t === 'rent' ? 'ให้เช่า' : t === 'sale' ? 'ขาย' : 'เช่า/ขาย'}
                  </button>
                ))}
              </div>
            </div>

            {/* ราคา */}
            <div className="grid grid-cols-2 gap-3">
              {(listingType === 'rent' || listingType === 'both') && (
                <div className={listingType === 'both' ? '' : 'col-span-2'}>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">
                    ราคาเช่า (บาท/เดือน) <span className="text-red-400">*</span>
                  </label>
                  <input value={rentPrice} onChange={e => setRentPrice(e.target.value.replace(/\D/g, ''))} placeholder="เช่น 15000" className={INPUT} inputMode="numeric" />
                </div>
              )}
              {(listingType === 'sale' || listingType === 'both') && (
                <div className={listingType === 'both' ? '' : 'col-span-2'}>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">
                    ราคาขาย (บาท) <span className="text-red-400">*</span>
                  </label>
                  <input value={salePrice} onChange={e => setSalePrice(e.target.value.replace(/\D/g, ''))} placeholder="เช่น 3500000" className={INPUT} inputMode="numeric" />
                </div>
              )}
              {(listingType === 'rent' || listingType === 'both') && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">เงินมัดจำ (เดือน)</label>
                  <input value={deposit} onChange={e => setDeposit(e.target.value.replace(/\D/g, ''))} placeholder="เช่น 2" className={INPUT} inputMode="numeric" />
                </div>
              )}
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2.5 text-sm text-red-700">{error}</div>
            )}
          </form>

          {/* Footer */}
          <div className="flex gap-2.5 px-5 py-4 border-t border-gray-100 flex-shrink-0">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 border border-gray-200 text-gray-600 text-sm font-medium rounded-xl hover:bg-gray-50 transition">
              ยกเลิก
            </button>
            <button type="button" onClick={handleSubmit} disabled={isPending}
              className="flex-[2] flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition">
              {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              {isPending ? 'กำลังบันทึก...' : 'สร้างทรัพย์ & เลือก'}
            </button>
          </div>
        </div>
      </div>

      {showQuickProject && (
        <QuickProjectModal
          onCreated={(id, name) => {
            setProjectId(id)
            setProjectName(name)
            setShowQuickProject(false)
          }}
          onClose={() => setShowQuickProject(false)}
        />
      )}
    </>
  )
}
