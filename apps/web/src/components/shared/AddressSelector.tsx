'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { ChevronDown, X } from 'lucide-react'
import type { PlacesData, PlaceRecord, SubdistrictRecord } from '@/lib/address/types'

// Versioned so old browser-cached responses (flat Thai-only format) are ignored
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
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const filtered = filterRecords(options, query)

  // Close on click/touch outside
  useEffect(() => {
    function close(e: MouseEvent | TouchEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', close)
    document.addEventListener('touchstart', close, { passive: true })
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('touchstart', close)
    }
  }, [])

  function openDropdown() {
    if (disabled) return
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

  return (
    <div>
      <label className="block text-xs text-gray-500 mb-1.5 font-medium">{label}</label>
      <div ref={containerRef} className="relative">
        {/* Invisible tap target to open — sits over the input */}
        {!open && (
          <div
            className="absolute inset-0 z-10 cursor-pointer"
            onClick={openDropdown}
            onTouchEnd={e => { e.preventDefault(); openDropdown() }}
          />
        )}
        <input
          ref={inputRef}
          value={open ? query : (value || '')}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => { if (!disabled) { setOpen(true); setQuery('') } }}
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

        {open && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl max-h-60 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="px-3 py-3 text-sm text-gray-400 text-center">ไม่พบข้อมูล</p>
            ) : (
              filtered.slice(0, 100).map(r => (
                <button
                  key={r.th}
                  type="button"
                  onMouseDown={e => { e.preventDefault(); handleSelect(r) }}
                  onTouchEnd={e => { e.preventDefault(); handleSelect(r) }}
                  className="w-full text-left px-4 py-2.5 hover:bg-blue-50 active:bg-blue-100 transition border-b border-gray-50 last:border-0"
                >
                  <span className="text-sm text-gray-800">{r.th}</span>
                  {r.en && <span className="ml-2 text-xs text-gray-400">{r.en}</span>}
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default function AddressSelector({ province, district, subdistrict, zip, onChange }: Props) {
  const [places, setPlaces] = useState<PlacesData | null>(
    isValidPlaces(globalPlaces) ? globalPlaces : null
  )

  useEffect(() => {
    if (isValidPlaces(globalPlaces)) { setPlaces(globalPlaces); return }
    globalPlaces = null // clear stale cache (old format)
    fetch(API_URL)
      .then(r => r.json())
      .then((data: unknown) => {
        if (isValidPlaces(data)) {
          globalPlaces = data
          setPlaces(data)
        }
      })
      .catch(err => console.error('[AddressSelector] fetch failed:', err))
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

  // Plain text fallback while loading
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
