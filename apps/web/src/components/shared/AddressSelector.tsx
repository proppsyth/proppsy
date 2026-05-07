'use client'

import { useState, useEffect } from 'react'
import type { PlacesData } from '@/app/api/places/route'

let globalPlaces: PlacesData | null = null

interface Props {
  province: string
  district: string
  subdistrict: string
  zip: string
  onChange: (field: 'province' | 'district' | 'subdistrict' | 'zip', value: string) => void
  className?: string
}

const SELECT_CLS = 'w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white transition'
const INPUT_CLS = 'w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition'

export default function AddressSelector({ province, district, subdistrict, zip, onChange }: Props) {
  const [places, setPlaces] = useState<PlacesData | null>(globalPlaces)

  useEffect(() => {
    if (globalPlaces) return
    fetch('/api/places')
      .then(r => r.json())
      .then((data: PlacesData) => {
        globalPlaces = data
        setPlaces(data)
      })
      .catch(() => {/* silently fail, fields become plain text */})
  }, [])

  const provinces = places ? Object.keys(places).sort() : []
  const districts = places && province ? Object.keys(places[province] ?? {}).sort() : []
  const subdistricts = places && province && district ? Object.keys((places[province] ?? {})[district] ?? {}).sort() : []

  function handleProvince(v: string) {
    onChange('province', v)
    onChange('district', '')
    onChange('subdistrict', '')
    onChange('zip', '')
  }

  function handleDistrict(v: string) {
    onChange('district', v)
    onChange('subdistrict', '')
    onChange('zip', '')
  }

  function handleSubdistrict(v: string) {
    onChange('subdistrict', v)
    const z = places && province && district ? ((places[province] ?? {})[district] ?? {})[v] ?? '' : ''
    onChange('zip', z)
  }

  if (!places) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <PlainField label="จังหวัด" value={province} onChange={v => onChange('province', v)} placeholder="กรุงเทพมหานคร" />
        <PlainField label="เขต / อำเภอ" value={district} onChange={v => onChange('district', v)} placeholder="เขต" />
        <PlainField label="แขวง / ตำบล" value={subdistrict} onChange={v => onChange('subdistrict', v)} placeholder="แขวง" />
        <PlainField label="รหัสไปรษณีย์" value={zip} onChange={v => onChange('zip', v.replace(/\D/g, '').slice(0, 5))} placeholder="10110" />
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div>
        <label className="block text-xs text-gray-500 mb-1.5 font-medium">จังหวัด</label>
        <select value={province} onChange={e => handleProvince(e.target.value)} className={SELECT_CLS}>
          <option value="">— เลือกจังหวัด —</option>
          {provinces.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      <div>
        <label className="block text-xs text-gray-500 mb-1.5 font-medium">เขต / อำเภอ</label>
        {districts.length > 0 ? (
          <select value={district} onChange={e => handleDistrict(e.target.value)} className={SELECT_CLS}>
            <option value="">— เลือกอำเภอ —</option>
            {districts.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        ) : (
          <input value={district} onChange={e => onChange('district', e.target.value)} placeholder="เลือกจังหวัดก่อน" className={INPUT_CLS} readOnly={!!province && districts.length === 0} />
        )}
      </div>

      <div>
        <label className="block text-xs text-gray-500 mb-1.5 font-medium">แขวง / ตำบล</label>
        {subdistricts.length > 0 ? (
          <select value={subdistrict} onChange={e => handleSubdistrict(e.target.value)} className={SELECT_CLS}>
            <option value="">— เลือกตำบล —</option>
            {subdistricts.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        ) : (
          <input value={subdistrict} onChange={e => onChange('subdistrict', e.target.value)} placeholder="เลือกอำเภอก่อน" className={INPUT_CLS} readOnly={!!district && subdistricts.length === 0} />
        )}
      </div>

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
