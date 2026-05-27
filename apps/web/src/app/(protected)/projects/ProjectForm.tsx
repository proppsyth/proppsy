'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Sparkles, Loader2, Plus, X } from 'lucide-react'
import type { Project } from '@/types'
import { createProject, updateProject, enrichProject } from './actions'
import type { ProjectInput } from './actions'
import AddressSelector from '@/components/shared/AddressSelector'

// ─── Constants ───────────────────────────────────────────────

const FACILITY_OPTIONS = [
  'สระว่ายน้ำ', 'ฟิตเนส', 'รักษาความปลอดภัย 24 ชม.', 'ที่จอดรถ',
  'ล็อบบี้', 'ร้านสะดวกซื้อ', 'สวน', 'ห้องซาวนา',
  'Co-working space', 'ห้องประชุม', 'สนามเด็กเล่น', 'ร้านอาหาร',
]

const BTS_MRT_OPTIONS = [
  'BTS อโศก', 'BTS พร้อมพงษ์', 'BTS ทองหล่อ', 'BTS เอกมัย',
  'BTS ออนนุช', 'BTS อ่อนนุช', 'BTS สยาม', 'BTS ชิดลม',
  'MRT สุขุมวิท', 'MRT เพชรบุรี', 'MRT พระราม 9', 'MRT ลาดพร้าว',
  'Airport Link มักกะสัน', 'Airport Link รามคำแหง',
]

// ─── Types ───────────────────────────────────────────────────

interface FormState {
  name_th: string
  name_en: string
  developer: string
  built_year: string
  total_floors: string
  total_units: string
  parking_pct: string
  facilities: string[]
  bts_mrt: string[]
  address_no: string
  moo: string
  address_road: string
  province: string
  district: string
  subdistrict: string
  zip: string
  map_url: string
}

const DEFAULT: FormState = {
  name_th: '', name_en: '', developer: '',
  built_year: '', total_floors: '', total_units: '', parking_pct: '',
  facilities: [], bts_mrt: [],
  address_no: '', moo: '', address_road: '', province: '',
  district: '', subdistrict: '', zip: '', map_url: '',
}

function projectToForm(p: Project): FormState {
  return {
    name_th: p.name_th ?? '',
    name_en: p.name_en ?? '',
    developer: p.developer ?? '',
    built_year: p.built_year?.toString() ?? '',
    total_floors: p.total_floors?.toString() ?? '',
    total_units: p.total_units?.toString() ?? '',
    parking_pct: p.parking_pct?.toString() ?? '',
    facilities: p.facilities ?? [],
    bts_mrt: p.bts_mrt ?? [],
    address_no: p.address_no ?? '',
    moo: p.moo ?? '',
    address_road: p.address_road ?? '',
    province: p.province ?? '',
    district: p.district ?? '',
    subdistrict: p.subdistrict ?? '',
    zip: p.zip ?? '',
    map_url: p.map_url ?? '',
  }
}

function toInput(f: FormState): ProjectInput {
  const str = (v: string) => v.trim() || undefined
  const num = (v: string) => v.trim() ? parseFloat(v) || undefined : undefined
  return {
    name_th: f.name_th.trim(),
    name_en: str(f.name_en),
    developer: str(f.developer),
    built_year: num(f.built_year),
    total_floors: num(f.total_floors),
    total_units: num(f.total_units),
    parking_pct: num(f.parking_pct),
    facilities: f.facilities,
    bts_mrt: f.bts_mrt,
    address_no: str(f.address_no),
    moo: str(f.moo),
    address_road: str(f.address_road),
    province: str(f.province),
    district: str(f.district),
    subdistrict: str(f.subdistrict),
    zip: str(f.zip),
    map_url: str(f.map_url),
  }
}

// ─── Component ───────────────────────────────────────────────

interface Props {
  initialData?: Project
  projectId?: string
}

export default function ProjectForm({ initialData, projectId }: Props) {
  const router = useRouter()
  const [form, setForm] = useState<FormState>(
    initialData ? projectToForm(initialData) : DEFAULT
  )
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()
  const [isEnriching, startEnrich] = useTransition()
  const [enrichMessage, setEnrichMessage] = useState('')
  const [btsInput, setBtsInput] = useState('')

  const set = (k: keyof FormState, v: string | string[]) =>
    setForm(f => ({ ...f, [k]: v }))

  function toggleArray(k: 'facilities' | 'bts_mrt', val: string) {
    setForm(f => ({
      ...f,
      [k]: f[k].includes(val) ? f[k].filter(v => v !== val) : [...f[k], val],
    }))
  }

  // ─── AI Enricher ─────────────────────────────────────────

  function handleEnrich() {
    const name = form.name_th.trim()
    if (!name) { setEnrichMessage('กรุณาใส่ชื่อโครงการก่อน'); return }
    setEnrichMessage('')
    startEnrich(async () => {
      const result = await enrichProject(name)
      if ('error' in result) {
        setEnrichMessage(result.error)
        return
      }
      const fields: string[] = []
      const apply = (k: keyof FormState, v: string | number | null | undefined) => {
        if (v != null) {
          set(k, v.toString())
          fields.push(k)
        }
      }
      apply('name_en', result.name_en)
      apply('developer', result.developer)
      apply('built_year', result.built_year)
      apply('total_floors', result.total_floors)
      apply('total_units', result.total_units)
      apply('parking_pct', result.parking_pct)
      apply('moo', result.moo)
      apply('address_road', result.address_road)
      apply('province', result.province)
      apply('district', result.district)
      apply('subdistrict', result.subdistrict)
      apply('zip', result.zip)
      if (result.facilities?.length) {
        set('facilities', result.facilities)
        fields.push('facilities')
      }
      if (result.bts_mrt?.length) {
        set('bts_mrt', result.bts_mrt)
        fields.push('bts_mrt')
      }
      setEnrichMessage(fields.length ? `กรอกข้อมูลอัตโนมัติ ${fields.length} รายการ` : 'ไม่พบข้อมูลเพิ่มเติม')
    })
  }

  // ─── Submit ──────────────────────────────────────────────

  function handleSubmit() {
    if (!form.name_th.trim()) { setError('กรุณาใส่ชื่อโครงการ'); return }
    setError('')
    startTransition(async () => {
      const input = toInput(form)
      if (projectId) {
        const res = await updateProject(projectId, input)
        if (res.error) { setError(res.error); return }
        router.push(`/projects/${projectId}`)
      } else {
        const res = await createProject(input)
        if (res.error) { setError(res.error); return }
        router.push(`/projects/${res.id}`)
      }
    })
  }

  // ─── Render ──────────────────────────────────────────────

  return (
    <div className="space-y-5">
      {/* AI Enricher */}
      <div className="bg-violet-50 border border-violet-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 bg-violet-100/60 border-b border-violet-200 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-violet-700" />
          <span className="text-sm font-semibold text-violet-800">AI ค้นหาข้อมูลโครงการ</span>
        </div>
        <div className="p-4 space-y-3">
          <p className="text-xs text-violet-700">ใส่ชื่อโครงการด้านล่าง แล้วกดปุ่มให้ AI กรอกข้อมูลให้อัตโนมัติ</p>
          <button
            type="button"
            onClick={handleEnrich}
            disabled={isEnriching}
            className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-lg transition disabled:opacity-50"
          >
            {isEnriching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {isEnriching ? 'กำลังค้นหา...' : 'ค้นหาข้อมูลโครงการ'}
          </button>
          {enrichMessage && (
            <p className={`text-xs font-medium ${enrichMessage.startsWith('กรอก') ? 'text-violet-700' : 'text-red-600'}`}>
              {enrichMessage}
            </p>
          )}
        </div>
      </div>

      {/* ชื่อโครงการ */}
      <Section title="ชื่อโครงการ *">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="ชื่อภาษาไทย *" value={form.name_th} onChange={v => set('name_th', v)} placeholder="ชื่อโครงการ" />
          <Field label="ชื่อภาษาอังกฤษ" value={form.name_en} onChange={v => set('name_en', v)} placeholder="Project name" />
        </div>
      </Section>

      {/* รายละเอียด */}
      <Section title="รายละเอียดโครงการ">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <Field label="ผู้พัฒนา" value={form.developer} onChange={v => set('developer', v)} placeholder="Developer" className="col-span-2 sm:col-span-3" />
          <Field label="ปีที่สร้างเสร็จ (ค.ศ.)" value={form.built_year} onChange={v => set('built_year', v)} placeholder="2020" type="number" />
          <Field label="จำนวนชั้น" value={form.total_floors} onChange={v => set('total_floors', v)} placeholder="30" type="number" />
          <Field label="จำนวนยูนิต" value={form.total_units} onChange={v => set('total_units', v)} placeholder="300" type="number" />
          <Field label="% ที่จอดรถ" value={form.parking_pct} onChange={v => set('parking_pct', v)} placeholder="50" type="number" />
        </div>
      </Section>

      {/* ที่ตั้ง */}
      <Section title="ที่ตั้ง">
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="บ้านเลขที่" value={form.address_no} onChange={v => set('address_no', v)} placeholder="123" />
            <Field label="หมู่ที่" value={form.moo} onChange={v => set('moo', v)} placeholder="5" />
            <Field label="ถนน / ซอย" value={form.address_road} onChange={v => set('address_road', v)} placeholder="ถ.สุขุมวิท" />
          </div>
          <AddressSelector
            province={form.province}
            district={form.district}
            subdistrict={form.subdistrict}
            zip={form.zip}
            onChange={(field, value) => set(field, value)}
          />
          <Field label="ลิงก์แผนที่ (Google Maps)" value={form.map_url} onChange={v => set('map_url', v)} placeholder="https://maps.google.com/..." />
        </div>
      </Section>

      {/* BTS/MRT */}
      <Section title="BTS / MRT ใกล้เคียง">
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {BTS_MRT_OPTIONS.map(s => (
              <button
                key={s}
                type="button"
                onClick={() => toggleArray('bts_mrt', s)}
                className={`px-2.5 py-1 text-xs rounded-full border transition ${
                  form.bts_mrt.includes(s)
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
          {/* Custom BTS/MRT */}
          <div className="flex gap-2">
            <input
              type="text"
              value={btsInput}
              onChange={e => setBtsInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && btsInput.trim()) {
                  e.preventDefault()
                  set('bts_mrt', [...form.bts_mrt, btsInput.trim()])
                  setBtsInput('')
                }
              }}
              placeholder="เพิ่มสถานีอื่น..."
              className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="button"
              onClick={() => {
                if (btsInput.trim()) {
                  set('bts_mrt', [...form.bts_mrt, btsInput.trim()])
                  setBtsInput('')
                }
              }}
              className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm transition"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          {form.bts_mrt.filter(s => !BTS_MRT_OPTIONS.includes(s)).length > 0 && (
            <div className="flex flex-wrap gap-2">
              {form.bts_mrt.filter(s => !BTS_MRT_OPTIONS.includes(s)).map(s => (
                <span key={s} className="flex items-center gap-1 px-2.5 py-1 text-xs bg-blue-100 text-blue-700 rounded-full">
                  {s}
                  <button type="button" onClick={() => set('bts_mrt', form.bts_mrt.filter(v => v !== s))}>
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      </Section>

      {/* สิ่งอำนวยความสะดวก */}
      <Section title="สิ่งอำนวยความสะดวก">
        <div className="flex flex-wrap gap-2">
          {FACILITY_OPTIONS.map(f => (
            <button
              key={f}
              type="button"
              onClick={() => toggleArray('facilities', f)}
              className={`px-2.5 py-1 text-xs rounded-full border transition ${
                form.facilities.includes(f)
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </Section>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pb-8">
        <Link
          href={projectId ? `/projects/${projectId}` : '/projects'}
          className="px-5 py-2.5 border border-gray-200 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50 transition"
        >
          ยกเลิก
        </Link>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isPending}
          className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition disabled:opacity-50 flex-1 justify-center"
        >
          {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
          {isPending ? 'กำลังบันทึก...' : projectId ? 'บันทึกการเปลี่ยนแปลง' : 'เพิ่มโครงการ'}
        </button>
      </div>
    </div>
  )
}

// ─── Sub-components ──────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50/70">
        <h2 className="text-sm font-semibold text-gray-700">{title}</h2>
      </div>
      <div className="p-4">{children}</div>
    </div>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return <label className="block text-xs text-gray-500 mb-1.5 font-medium">{children}</label>
}

interface FieldProps {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
  maxLength?: number
  className?: string
}

function Field({ label, value, onChange, placeholder, type = 'text', maxLength, className }: FieldProps) {
  return (
    <div className={className}>
      <Label>{label}</Label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
      />
    </div>
  )
}
