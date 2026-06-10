'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, X } from 'lucide-react'
import type { PlacesData, PlaceRecord, SubdistrictRecord } from '@/lib/address/types'

const API_URL = '/api/places?v=2'

let globalPlaces: PlacesData | null = null

function isValidPlaces(d: unknown): d is PlacesData {
  return (
    d != null &&
    typeof d === 'object' &&
    Array.isArray((d as PlacesData).provinces) &&
    (d as PlacesData).provinces.length > 0
  )
}

interface Props {
  province: string
  district: string
  subdistrict: string
  zip: string
  onChange: (field: 'province' | 'district' | 'subdistrict' | 'zip', value: string) => void
  className?: string
}

const INPUT_CLS = 'w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition bg-white'

function filterRecords<T extends PlaceRecord>(records: T[], query: string): T[] {
  if (!query.trim()) return records
  const q = query.toLowerCase()
  return records.filter(r => r.th.toLowerCase().includes(q) || r.en.toLowerCase().includes(q))
}

interface DropdownRect { top: number; left: number; width: number }

interface ComboboxProps<T extends PlaceRecord> {
  label: string
  value: string
  options: T[]
  placeholder: string
  disabled?: boolean
  onSelect: (record: T) => void
  onClear: () => void
}

function AddressCombobox<T extends PlaceRecord>({
  label, value, options, placeholder, disabled, onSelect, onClear,
}: ComboboxProps<T>) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [dropRect, setDropRect] = useState<DropdownRect | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropRef = useRef<HTMLDivElement>(null)
  const touchStartRef = useRef<{ x: number; y: number } | null>(null)

  const filtered = filterRecords(options, query)

  // Measure input position so the portal dropdown aligns with it
  function measureRect(): DropdownRect | null {
    const el = containerRef.current
    if (!el) return null
    const r = el.getBoundingClientRect()
    return { top: r.bottom + window.scrollY + 4, left: r.left + window.scrollX, width: r.width }
  }

  // Close on outside click/touch
  useEffect(() => {
    if (!open) return
    function close(e: MouseEvent | TouchEvent) {
      const target = e.target as Node
      if (containerRef.current?.contains(target) || dropRef.current?.contains(target)) return
      setOpen(false)
      setQuery('')
    }
    document.addEventListener('mousedown', close)
    document.addEventListener('touchstart', close, { passive: true })
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('touchstart', close)
    }
  }, [open])

  // Reposition on scroll/resize while open
  useEffect(() => {
    if (!open) return
    function reposition() { setDropRect(measureRect()) }
    window.addEventListener('scroll', reposition, { passive: true, capture: true })
    window.addEventListener('resize', reposition, { passive: true })
    return () => {
      window.removeEventListener('scroll', reposition, true)
      window.removeEventListener('resize', reposition)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  function openDropdown() {
    if (disabled) return
    setDropRect(measureRect())
    setOpen(true)
    setQuery('')
    inputRef.current?.focus()
  }

  function handleSelect(record: T) {
    onSelect(record)
    setOpen(false)
    setQuery('')
    inputRef.current?.blur()
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation()
    onClear()
    setQuery('')
    setOpen(false)
  }

  const dropdown = open && dropRect ? createPortal(
    <div
      ref={dropRef}
      style={{ position: 'absolute', top: dropRect.top, left: dropRect.left, width: dropRect.width, zIndex: 9999 }}
      className="bg-white border border-gray-200 rounded-xl shadow-2xl max-h-64 overflow-y-auto overscroll-contain"
    >
      {filtered.length === 0 ? (
        <p className="px-4 py-3 text-sm text-gray-400 text-center">ไม่พบข้อมูล</p>
      ) : (
        filtered.slice(0, 100).map(r => (
          <button
            key={r.th}
            type="button"
            onMouseDown={e => e.preventDefault()}
            onClick={() => handleSelect(r)}
            className="w-full text-left px-4 py-2.5 hover:bg-blue-50 active:bg-blue-100 transition text-sm text-gray-800 border-b border-gray-50 last:border-0"
          >
            {r.th}
            {r.en && <span className="ml-2 text-xs text-gray-400">{r.en}</span>}
          </button>
        ))
      )}
    </div>,
    document.body
  ) : null

  return (
    <div>
      <label className="block text-xs text-gray-500 mb-1.5 font-medium">{label}</label>
      <div ref={containerRef} className="relative">
        {!open && !disabled && (
          <div
            className="absolute inset-0 z-10 cursor-pointer"
            onClick={openDropdown}
            onTouchStart={e => {
              const t = e.touches.item(0)
              if (t) touchStartRef.current = { x: t.clientX, y: t.clientY }
            }}
            onTouchEnd={e => {
              const start = touchStartRef.current
              touchStartRef.current = null
              if (!start) return
              const t = e.changedTouches.item(0)
              if (!t) return
              const dy = Math.abs(t.clientY - start.y)
              const dx = Math.abs(t.clientX - start.x)
              if (dy > 8 || dx > 8) return
              e.preventDefault()
              openDropdown()
            }}
          />
        )}
        <input
          ref={inputRef}
          value={open ? query : (value || '')}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => {
            // Only open on focus when it's a keyboard/mouse focus, not a touch scroll artifact.
            // If a touch is in progress (touchStartRef set), the touch handler owns the open logic.
            if (!disabled && !open && !touchStartRef.current) openDropdown()
          }}
          placeholder={disabled ? 'เลือกระดับก่อนหน้าก่อน' : placeholder}
          disabled={disabled}
          className={`${INPUT_CLS} pr-8 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          autoComplete="off"
          readOnly={!open}
        />
        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1 z-20">
          {value && !disabled ? (
            <button type="button" onClick={handleClear} className="text-gray-400 hover:text-gray-600 p-0.5">
              <X className="w-3 h-3" />
            </button>
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400 pointer-events-none" />
          )}
        </div>
      </div>
      {dropdown}
    </div>
  )
}

export default function AddressSelector({ province, district, subdistrict, zip, onChange }: Props) {
  const [places, setPlaces] = useState<PlacesData | null>(
    isValidPlaces(globalPlaces) ? globalPlaces : null
  )

  useEffect(() => {
    if (isValidPlaces(globalPlaces)) { setPlaces(globalPlaces); return }
    globalPlaces = null

    async function loadPlaces() {
      const res = await fetch(API_URL)
      const ct = res.headers.get('content-type') ?? ''
      if (!ct.includes('application/json')) {
        const preview = (await res.text()).slice(0, 120).replace(/\s+/g, ' ')
        throw new Error(
          `[places] Expected application/json but got "${ct}" (HTTP ${res.status}). Body: ${preview}`
        )
      }
      const data: unknown = await res.json()
      if (isValidPlaces(data)) {
        globalPlaces = data
        setPlaces(data)
      }
    }

    loadPlaces().catch(err => console.error('[AddressSelector]', err instanceof Error ? err.message : err))
  }, [])

  const provinces: PlaceRecord[] = places?.provinces ?? []
  const districts: PlaceRecord[] = places && province ? (places.districts[province] ?? []) : []
  const subdistricts: SubdistrictRecord[] = places && province && district
    ? (places.subdistricts[`${province}|${district}`] ?? [])
    : []

  const handleProvince = useCallback((r: PlaceRecord) => {
    onChange('province', r.th)
    onChange('district', '')
    onChange('subdistrict', '')
    onChange('zip', '')
  }, [onChange])

  const handleDistrict = useCallback((r: PlaceRecord) => {
    onChange('district', r.th)
    onChange('subdistrict', '')
    onChange('zip', '')
  }, [onChange])

  const handleSubdistrict = useCallback((r: SubdistrictRecord) => {
    onChange('subdistrict', r.th)
    onChange('zip', r.zip)
  }, [onChange])

  if (!places) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <PlainField label="จังหวัด" value={province} onChange={v => onChange('province', v)} placeholder="กรุงเทพมหานคร" />
        <PlainField label="เขต / อำเภอ" value={district} onChange={v => onChange('district', v)} placeholder="เขต / อำเภอ" />
        <PlainField label="แขวง / ตำบล" value={subdistrict} onChange={v => onChange('subdistrict', v)} placeholder="แขวง / ตำบล" />
        <PlainField label="รหัสไปรษณีย์" value={zip} onChange={v => onChange('zip', v.replace(/\D/g, '').slice(0, 5))} placeholder="10110" />
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <AddressCombobox
        label="จังหวัด"
        value={province}
        options={provinces}
        placeholder="ค้นหาจังหวัด..."
        onSelect={handleProvince}
        onClear={() => { onChange('province', ''); onChange('district', ''); onChange('subdistrict', ''); onChange('zip', '') }}
      />
      <AddressCombobox
        label="เขต / อำเภอ"
        value={district}
        options={districts}
        placeholder="ค้นหาอำเภอ..."
        disabled={!province}
        onSelect={handleDistrict}
        onClear={() => { onChange('district', ''); onChange('subdistrict', ''); onChange('zip', '') }}
      />
      <AddressCombobox<SubdistrictRecord>
        label="แขวง / ตำบล"
        value={subdistrict}
        options={subdistricts}
        placeholder="ค้นหาตำบล..."
        disabled={!district}
        onSelect={handleSubdistrict}
        onClear={() => { onChange('subdistrict', ''); onChange('zip', '') }}
      />
      <div>
        <label className="block text-xs text-gray-500 mb-1.5 font-medium">รหัสไปรษณีย์</label>
        <input
          value={zip}
          onChange={e => onChange('zip', e.target.value.replace(/\D/g, '').slice(0, 5))}
          placeholder="10110"
          maxLength={5}
          className={INPUT_CLS}
        />
      </div>
    </div>
  )
}

function PlainField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-1.5 font-medium">{label}</label>
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className={INPUT_CLS} />
    </div>
  )
}
