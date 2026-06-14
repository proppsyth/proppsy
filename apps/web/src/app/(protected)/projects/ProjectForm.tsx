'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Sparkles, Loader2, Plus, X, CheckCircle2, AlertCircle, Train, ChevronDown, MapPin, School, ShoppingBag, Heart, Landmark, Store, UtensilsCrossed, Star } from 'lucide-react'
import type { Project } from '@/types'
import { createProject, updateProject, enrichProject } from './actions'
import type { ProjectInput } from './actions'
import AddressSelector from '@/components/shared/AddressSelector'
import { stationColorClass, stationDotClass } from '@/lib/transitColors'

// ─── Constants ───────────────────────────────────────────────

const FACILITY_OPTIONS = [
  'สระว่ายน้ำ', 'ฟิตเนส', 'รักษาความปลอดภัย 24 ชม.', 'ที่จอดรถ',
  'ล็อบบี้', 'ร้านสะดวกซื้อ', 'สวน', 'ห้องซาวนา',
  'Co-working space', 'ห้องประชุม', 'สนามเด็กเล่น', 'ร้านอาหาร',
]

// Canonical station list — Thai only, all active lines
// Used for combobox suggestions; DB-loaded stations (existingStations prop) appear first
const CANONICAL_STATIONS: string[] = [
  // BTS สุขุมวิท (สายสีเขียวเข้ม)
  'BTS หมอชิต','BTS สะพานควาย','BTS อารีย์','BTS สนามเป้า',
  'BTS อนุสาวรีย์ชัยสมรภูมิ','BTS พญาไท','BTS ราชเทวี','BTS สยาม',
  'BTS ชิดลม','BTS เพลินจิต','BTS นานา','BTS อโศก',
  'BTS พร้อมพงษ์','BTS ทองหล่อ','BTS เอกมัย','BTS พระโขนง',
  'BTS อ่อนนุช','BTS บางจาก','BTS ปุณณวิถี','BTS อุดมสุข',
  'BTS บางนา','BTS แบริ่ง','BTS สำโรง','BTS ปู่เจ้า',
  'BTS ช้างเผือก','BTS สายลวด','BTS เคหะฯ','BTS คูคต',
  // BTS สีลม (สายสีเขียวอ่อน)
  'BTS สนามกีฬาแห่งชาติ','BTS ราชดำริ','BTS ศาลาแดง',
  'BTS ช่องนนทรี','BTS สุรศักดิ์','BTS สะพานตากสิน',
  'BTS กรุงธนบุรี','BTS วงเวียนใหญ่','BTS โพธิ์นิมิต',
  'BTS ตลาดพลู','BTS วุฒากาศ','BTS บางหว้า',
  // BTS สายสีทอง
  'BTS เจริญนคร','BTS คลองสาน',
  // MRT สายสีน้ำเงิน
  'MRT ท่าพระ','MRT บางขุนนนท์','MRT บางอ้อ','MRT บางพลัด',
  'MRT สิรินธร','MRT บางยี่ขัน','MRT เตาปูน','MRT บางซื่อ',
  'MRT กำแพงเพชร','MRT จตุจักร','MRT พหลโยธิน','MRT ลาดพร้าว',
  'MRT รัชดาภิเษก','MRT สุทธิสาร','MRT ห้วยขวาง',
  'MRT ศูนย์วัฒนธรรมแห่งประเทศไทย','MRT พระราม 9','MRT เพชรบุรี',
  'MRT สุขุมวิท','MRT สีลม','MRT สามย่าน','MRT หัวลำโพง',
  'MRT วังบูรพาภิรมย์','MRT สนามไชย','MRT อิสรภาพ',
  'MRT บางไผ่','MRT เพชรเกษม 48','MRT ภาษีเจริญ',
  'MRT บางแค','MRT หลักสอง','MRT โชคชัย 4',
  // MRT สายสีม่วง
  'MRT คลองบางไผ่','MRT ตลาดบางใหญ่','MRT สามแยกบางใหญ่',
  'MRT บางพูด','MRT บางรักน้อย-ท่าอิฐ','MRT ไทรม้า',
  'MRT สะพานพระนั่งเกล้า','MRT แยกนนทบุรี 1','MRT บางกระสอ',
  'MRT ศูนย์ราชการนนทบุรี','MRT กระทรวงสาธารณสุข',
  'MRT แยกติวานนท์','MRT วงศ์สว่าง','MRT บางซ่อน',
  // MRT สายสีชมพู
  'MRT แคราย','MRT สนามบินน้ำ','MRT สามแยกปากเกร็ด',
  'MRT ปากเกร็ด','MRT เมืองทองธานี','MRT มีนบุรี',
  // MRT สายสีเหลือง
  'MRT ลาดพร้าว 71','MRT ลาดพร้าว 83','MRT มหาดไทย',
  'MRT ลาดพร้าว 101','MRT บางกะปิ','MRT แยกลำสาลี',
  'MRT ศรีนุช','MRT ศรีกรีฑา','MRT หัวหมาก','MRT ทับช้าง',
  // Airport Rail Link
  'ARL พญาไท','ARL ราชปรารภ','ARL มักกะสัน',
  'ARL รามคำแหง','ARL หัวหมาก','ARL บ้านทับช้าง',
  'ARL ลาดกระบัง','ARL สุวรรณภูมิ',
  // SRT สายสีแดง
  'SRT รังสิต','SRT ดอนเมือง','SRT หลักหก','SRT การเคหะ',
  'SRT บางเขน','SRT หลักสี่','SRT มหาวิทยาลัยเกษตรศาสตร์',
  'SRT บางซื่อ','SRT ตลิ่งชัน',
  // BRT
  'BRT ราชพฤกษ์','BRT สาทร','BRT อาคารสงเคราะห์',
]

// ─── Types ───────────────────────────────────────────────────

interface TransitEntry { station: string; line: string; distance_m: number }
interface AmenityEntry { name: string; category: string; distance_m: number }

const AMENITY_CATEGORIES = [
  { value: 'education',   label: 'สถานศึกษา/มหาวิทยาลัย', Icon: School },
  { value: 'shopping',    label: 'ห้าง/ช้อปปิ้ง',          Icon: ShoppingBag },
  { value: 'healthcare',  label: 'โรงพยาบาล',              Icon: Heart },
  { value: 'cultural',    label: 'วัด/ศาสนสถาน',           Icon: Landmark },
  { value: 'convenience', label: 'ร้านสะดวกซื้อ',          Icon: Store },
  { value: 'restaurant',  label: 'ร้านอาหารชื่อดัง',       Icon: UtensilsCrossed },
  { value: 'landmark',    label: 'สถานที่ดังๆ อื่นๆ',      Icon: Star },
]

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

function toInput(
  f: FormState,
  transitDistances: TransitEntry[],
  amenities: AmenityEntry[],
): ProjectInput {
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
    transit_distances: transitDistances.length ? transitDistances : null,
    nearby_amenities:  amenities.length        ? amenities        : null,
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
  /** Station names already used in DB — shown first in combobox */
  existingStations?: string[]
}

export default function ProjectForm({ initialData, projectId, existingStations = [] }: Props) {
  const router = useRouter()
  const [form, setForm] = useState<FormState>(
    initialData ? projectToForm(initialData) : DEFAULT
  )
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()
  const [isEnriching, startEnrich] = useTransition()
  const [enrichMessage, setEnrichMessage] = useState('')
  // Transit distances & amenities (structured arrays, not part of string FormState)
  const [transitDistances, setTransitDistances] = useState<TransitEntry[]>(
    () => (initialData as unknown as { transit_distances?: TransitEntry[] })?.transit_distances ?? []
  )
  const [amenities, setAmenities] = useState<AmenityEntry[]>(
    () => (initialData as unknown as { nearby_amenities?: AmenityEntry[] })?.nearby_amenities ?? []
  )
  // Row-add state for transit
  const [newTransit, setNewTransit] = useState<TransitEntry>({ station: '', line: '', distance_m: 0 })
  // Row-add state for amenities
  const [newAmenity, setNewAmenity] = useState<AmenityEntry>({ name: '', category: 'education', distance_m: 0 })

  const [stationSearch, setStationSearch] = useState('')
  const [stationOpen, setStationOpen] = useState(false)
  const stationRef = useRef<HTMLDivElement>(null)

  // Close dropdown on outside click
  useEffect(() => {
    if (!stationOpen) return
    function handler(e: MouseEvent) {
      if (stationRef.current && !stationRef.current.contains(e.target as Node)) setStationOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [stationOpen])
  const [bypassDuplicate, setBypassDuplicate] = useState(false)
  const [duplicateSuggestion, setDuplicateSuggestion] = useState<{
    id: string
    name: string
    nameEn: string | null
  } | null>(null)
  const [nameCorrection, setNameCorrection] = useState<{
    original: string
    corrected_th: string
    name_en: string | null
    confidence: number
  } | null>(null)

  const set = (k: keyof FormState, v: string | string[]) =>
    setForm(f => ({ ...f, [k]: v }))

  function toggleArray(k: 'facilities' | 'bts_mrt', val: string) {
    setForm(f => ({
      ...f,
      [k]: f[k].includes(val) ? f[k].filter(v => v !== val) : [...f[k], val],
    }))
  }

  // ─── AI Enricher (bilingual + name normalization) ────────

  function handleEnrich() {
    // Accept Thai OR English project name as the search term
    const rawInput = form.name_th.trim() || form.name_en.trim()
    if (!rawInput) { setEnrichMessage('กรุณาใส่ชื่อโครงการก่อน'); return }
    setEnrichMessage('')
    setNameCorrection(null)
    startEnrich(async () => {
      const result = await enrichProject(rawInput)
      if ('error' in result) {
        setEnrichMessage(result.error)
        return
      }

      const CONFIDENCE_THRESHOLD = 70
      const confidence = result.confidence ?? 0
      const fields: string[] = []
      const apply = (k: keyof FormState, v: string | number | null | undefined) => {
        if (v != null) { set(k, v.toString()); fields.push(k) }
      }

      // ── Canonical name normalization ──────────────────────
      // When confidence is high enough, replace the name fields with the
      // AI-canonical version even if the user typed it differently.
      if (confidence >= CONFIDENCE_THRESHOLD) {
        const canonicalTh = result.name_th?.trim() ?? ''
        const canonicalEn = result.name_en?.trim() ?? null

        // Track correction so the UI can display the before/after
        const originalInput = rawInput
        const nameChanged = canonicalTh && canonicalTh !== originalInput
        if (nameChanged || canonicalEn) {
          setNameCorrection({
            original:     originalInput,
            corrected_th: canonicalTh || originalInput,
            name_en:      canonicalEn,
            confidence,
          })
        }

        if (canonicalTh) { set('name_th', canonicalTh); fields.push('name_th') }
        if (canonicalEn) { set('name_en', canonicalEn); fields.push('name_en') }
      } else {
        // Low confidence: still apply name_en if available, keep user's name_th
        if (result.name_en) { set('name_en', result.name_en); fields.push('name_en') }
      }

      // ── Enrichment fields ─────────────────────────────────
      apply('developer',   result.developer)
      apply('built_year',  result.built_year)
      apply('total_floors',result.total_floors)
      apply('total_units', result.total_units)
      apply('parking_pct', result.parking_pct)
      apply('moo',         result.moo)
      apply('address_road',result.address_road)
      apply('province',    result.province)
      apply('district',    result.district)
      apply('subdistrict', result.subdistrict)
      apply('zip',         result.zip)
      if (result.facilities?.length) { set('facilities', result.facilities); fields.push('facilities') }
      if (result.bts_mrt?.length)    { set('bts_mrt',   result.bts_mrt);    fields.push('bts_mrt') }
      if (result.map_url)            { set('map_url', result.map_url);       fields.push('map_url') }
      if (result.transit_distances?.length) {
        setTransitDistances(result.transit_distances as TransitEntry[])
        fields.push('transit_distances')
      }
      if (result.nearby_amenities?.length) {
        setAmenities(result.nearby_amenities as AmenityEntry[])
        fields.push('nearby_amenities')
      }

      const uniqueFields = [...new Set(fields)]
      setEnrichMessage(uniqueFields.length ? `กรอกข้อมูลอัตโนมัติ ${uniqueFields.length} รายการ` : 'ไม่พบข้อมูลเพิ่มเติม')
    })
  }

  // ─── Submit ──────────────────────────────────────────────

  function handleSubmit() {
    if (!form.name_th.trim()) { setError('กรุณาใส่ชื่อโครงการ'); return }
    setError('')
    setDuplicateSuggestion(null)
    startTransition(async () => {
      const input = toInput(form, transitDistances, amenities)
      if (projectId) {
        const res = await updateProject(projectId, input)
        if (res.error) { setError(res.error); return }
        router.push(`/projects/${projectId}`)
      } else {
        const res = await createProject(input, bypassDuplicate)
        if (res.existingId) {
          setDuplicateSuggestion({
            id:     res.existingId,
            name:   res.existingName ?? '',
            nameEn: res.existingNameEn ?? null,
          })
          return
        }
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
          <p className="text-xs text-violet-700">
            ใส่ชื่อโครงการด้านล่าง (ภาษาไทยหรือภาษาอังกฤษก็ได้) แล้วกดปุ่มให้ AI ระบุโครงการและกรอกข้อมูลอัตโนมัติ
          </p>
          <button
            type="button"
            onClick={handleEnrich}
            disabled={isEnriching}
            className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-lg transition disabled:opacity-50"
          >
            {isEnriching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {isEnriching ? 'กำลังค้นหา...' : 'ค้นหาข้อมูลโครงการ'}
          </button>

          {/* Name correction notice */}
          {nameCorrection && (
            <div className="bg-white border border-violet-200 rounded-lg p-3 space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-violet-800">
                <CheckCircle2 className="w-3.5 h-3.5 text-violet-600" />
                AI ระบุโครงการและแก้ไขชื่อแล้ว
              </div>
              {nameCorrection.corrected_th !== nameCorrection.original && (
                <div className="text-xs text-gray-500 flex items-start gap-1.5">
                  <span className="text-gray-400 flex-shrink-0">จาก:</span>
                  <span className="line-through text-gray-400">{nameCorrection.original}</span>
                </div>
              )}
              <div className="text-xs flex items-start gap-1.5">
                <span className="text-violet-500 flex-shrink-0 font-medium">ไทย:</span>
                <span className="font-semibold text-gray-800">{nameCorrection.corrected_th}</span>
              </div>
              {nameCorrection.name_en && (
                <div className="text-xs flex items-start gap-1.5">
                  <span className="text-violet-500 flex-shrink-0 font-medium">EN:</span>
                  <span className="font-semibold text-gray-800">{nameCorrection.name_en}</span>
                </div>
              )}
              <div className="text-xs text-gray-400">
                ความมั่นใจ {nameCorrection.confidence}%
              </div>
            </div>
          )}

          {enrichMessage && !nameCorrection && (
            <div className={`flex items-center gap-1.5 text-xs font-medium ${enrichMessage.startsWith('กรอก') ? 'text-violet-700' : 'text-red-600'}`}>
              {enrichMessage.startsWith('กรอก')
                ? <CheckCircle2 className="w-3.5 h-3.5" />
                : <AlertCircle className="w-3.5 h-3.5" />}
              {enrichMessage}
            </div>
          )}
          {enrichMessage && nameCorrection && (
            <p className="text-xs text-violet-600">{enrichMessage}</p>
          )}
        </div>
      </div>

      {/* ชื่อโครงการ */}
      <Section title="ชื่อโครงการ *">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="ชื่อภาษาไทย *" value={form.name_th} onChange={v => { set('name_th', v); setNameCorrection(null) }} placeholder="ชื่อโครงการ (หรือพิมพ์ภาษาอังกฤษแล้วให้ AI แปล)" />
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

      {/* BTS/MRT — combobox (Section ต้องไม่ clip overflow เพื่อให้ dropdown โชว์ได้) */}
      <Section title="BTS / MRT ใกล้เคียง" noClip>
        <div className="space-y-3">
          {/* Selected stations chips */}
          {form.bts_mrt.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {form.bts_mrt.map(s => (
                <span key={s} className={`flex items-center gap-1 px-2.5 py-1 text-xs rounded-full font-medium border ${stationColorClass(s)}`}>
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${stationDotClass(s)}`} />
                  {s}
                  <button type="button" onClick={() => set('bts_mrt', form.bts_mrt.filter(v => v !== s))} className="ml-0.5 hover:opacity-60 transition">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Combobox */}
          <div ref={stationRef} className="relative">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Train className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={stationSearch}
                  onChange={e => { setStationSearch(e.target.value); setStationOpen(true) }}
                  onFocus={() => setStationOpen(true)}
                  onKeyDown={e => {
                    // Allow adding custom station with Enter if no match
                    if (e.key === 'Enter' && stationSearch.trim()) {
                      e.preventDefault()
                      const val = stationSearch.trim()
                      if (!form.bts_mrt.includes(val)) set('bts_mrt', [...form.bts_mrt, val])
                      setStationSearch('')
                      setStationOpen(false)
                    }
                    if (e.key === 'Escape') setStationOpen(false)
                  }}
                  placeholder="ค้นหาสถานี เช่น BTS อโศก, MRT สุทธิสาร..."
                  className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                />
              </div>
              <button
                type="button"
                onClick={() => setStationOpen(o => !o)}
                className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl transition"
              >
                <ChevronDown className={`w-4 h-4 text-gray-600 transition-transform ${stationOpen ? 'rotate-180' : ''}`} />
              </button>
            </div>

            {stationOpen && (() => {
              const q = stationSearch.trim().toLowerCase()
              // DB stations first, then canonical list — deduplicated
              const allOptions = [...new Set([...existingStations, ...CANONICAL_STATIONS])]
              const filtered = q
                ? allOptions.filter(s => s.toLowerCase().includes(q))
                : allOptions
              const available = filtered.filter(s => !form.bts_mrt.includes(s))
              if (available.length === 0 && !q) return null
              return (
                <div className="absolute z-20 top-full mt-1 left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto py-1">
                  {q && !CANONICAL_STATIONS.includes(stationSearch.trim()) && stationSearch.trim() && (
                    <button
                      type="button"
                      onClick={() => {
                        const val = stationSearch.trim()
                        if (!form.bts_mrt.includes(val)) set('bts_mrt', [...form.bts_mrt, val])
                        setStationSearch('')
                        setStationOpen(false)
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 flex items-center gap-2 border-b border-gray-100"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      เพิ่ม &ldquo;{stationSearch.trim()}&rdquo;
                    </button>
                  )}
                  {available.length > 0
                    ? available.map(s => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => {
                            set('bts_mrt', [...form.bts_mrt, s])
                            setStationSearch('')
                            setStationOpen(false)
                          }}
                          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                        >
                          <Train className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                          {s}
                          {existingStations.includes(s) && (
                            <span className="ml-auto text-[10px] text-blue-500 font-medium">ใช้แล้ว</span>
                          )}
                        </button>
                      ))
                    : (
                        <p className="px-4 py-3 text-sm text-gray-400 text-center">ไม่พบสถานี</p>
                      )
                  }
                </div>
              )
            })()}
          </div>
          <p className="text-xs text-gray-400">พิมพ์ชื่อสถานีเพื่อค้นหา หรือกด ▾ เพื่อดูรายการทั้งหมด · Enter เพิ่มชื่อที่ไม่มีในรายการ</p>
        </div>
      </Section>

      {/* ระยะทางรถไฟฟ้า */}
      <Section title="ระยะทางสถานีรถไฟฟ้า (เมตร)">
        <div className="space-y-2">
          {transitDistances.length > 0 && (
            <div className="space-y-1.5">
              {transitDistances.map((t, i) => (
                <div key={i} className="flex items-center gap-2 text-sm bg-gray-50 rounded-lg px-3 py-2">
                  <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${stationDotClass(t.station)}`} />
                  <span className="font-medium text-gray-800 flex-1 truncate">{t.station}</span>
                  <span className="text-xs text-gray-400 truncate hidden sm:block">{t.line}</span>
                  <span className="text-xs font-semibold text-gray-700 flex-shrink-0 ml-auto">
                    {t.distance_m >= 1000
                      ? `${(t.distance_m / 1000).toFixed(1)} กม.`
                      : `${t.distance_m} ม.`}
                  </span>
                  <button type="button" onClick={() => setTransitDistances(prev => prev.filter((_, j) => j !== i))} className="text-gray-300 hover:text-red-500 transition flex-shrink-0">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
          {/* Add row */}
          <div className="grid grid-cols-12 gap-2 pt-1">
            <input
              type="text"
              value={newTransit.station}
              onChange={e => setNewTransit(p => ({ ...p, station: e.target.value }))}
              placeholder="ชื่อสถานี เช่น BTS อโศก"
              className="col-span-5 px-2.5 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              value={newTransit.line}
              onChange={e => setNewTransit(p => ({ ...p, line: e.target.value }))}
              placeholder="สาย เช่น BTS สุขุมวิท"
              className="col-span-4 px-2.5 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="number"
              value={newTransit.distance_m || ''}
              onChange={e => setNewTransit(p => ({ ...p, distance_m: parseInt(e.target.value) || 0 }))}
              placeholder="ม."
              className="col-span-2 px-2.5 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="button"
              onClick={() => {
                if (!newTransit.station.trim()) return
                setTransitDistances(prev => [...prev, { ...newTransit }])
                setNewTransit({ station: '', line: '', distance_m: 0 })
              }}
              className="col-span-1 flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-gray-400">AI จะกรอกให้อัตโนมัติเมื่อกดค้นหาโครงการ หรือเพิ่มเองด้วยปุ่ม +</p>
        </div>
      </Section>

      {/* สถานที่ใกล้เคียง */}
      <Section title="สถานที่สำคัญใกล้เคียง (รัศมี 5 กม.)">
        <div className="space-y-2">
          {amenities.length > 0 && (
            <div className="space-y-1.5">
              {amenities.map((a, i) => {
                const cat = AMENITY_CATEGORIES.find(c => c.value === a.category)
                const CatIcon = cat?.Icon ?? MapPin
                return (
                  <div key={i} className="flex items-center gap-2 text-sm bg-gray-50 rounded-lg px-3 py-2">
                    <CatIcon className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                    <span className="font-medium text-gray-800 flex-1 truncate">{a.name}</span>
                    <span className="text-xs text-gray-400 hidden sm:block">{cat?.label ?? a.category}</span>
                    <span className="text-xs font-semibold text-gray-700 flex-shrink-0 ml-auto">
                      {a.distance_m >= 1000
                        ? `${(a.distance_m / 1000).toFixed(1)} กม.`
                        : `${a.distance_m} ม.`}
                    </span>
                    <button type="button" onClick={() => setAmenities(prev => prev.filter((_, j) => j !== i))} className="text-gray-300 hover:text-red-500 transition flex-shrink-0">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )
              })}
            </div>
          )}
          {/* Add row */}
          <div className="grid grid-cols-12 gap-2 pt-1">
            <input
              type="text"
              value={newAmenity.name}
              onChange={e => setNewAmenity(p => ({ ...p, name: e.target.value }))}
              placeholder="ชื่อสถานที่ เช่น Central World"
              className="col-span-5 px-2.5 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <select
              value={newAmenity.category}
              onChange={e => setNewAmenity(p => ({ ...p, category: e.target.value }))}
              className="col-span-4 px-2.5 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              {AMENITY_CATEGORIES.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
            <input
              type="number"
              value={newAmenity.distance_m || ''}
              onChange={e => setNewAmenity(p => ({ ...p, distance_m: parseInt(e.target.value) || 0 }))}
              placeholder="ม."
              className="col-span-2 px-2.5 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="button"
              onClick={() => {
                if (!newAmenity.name.trim()) return
                setAmenities(prev => [...prev, { ...newAmenity }])
                setNewAmenity({ name: '', category: 'education', distance_m: 0 })
              }}
              className="col-span-1 flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-gray-400">AI จะกรอกให้อัตโนมัติ (รัศมี 5 กม. ทุกแห่งที่หาเจอ) หรือเพิ่มเองด้วยปุ่ม +</p>
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

      {/* Duplicate suggestion */}
      {duplicateSuggestion && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 space-y-2">
          <div className="flex items-center gap-1.5 text-sm font-semibold text-amber-800">
            <AlertCircle className="w-4 h-4 text-amber-600" />
            โครงการนี้มีอยู่ในระบบแล้ว
          </div>
          <p className="text-sm text-amber-700">
            {duplicateSuggestion.name}
            {duplicateSuggestion.nameEn && <span className="text-amber-500 ml-1">({duplicateSuggestion.nameEn})</span>}
          </p>
          <div className="flex gap-2 pt-1">
            <Link
              href={`/projects/${duplicateSuggestion.id}`}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-medium rounded-lg transition"
            >
              ดูโครงการที่มีอยู่
            </Link>
            <button
              type="button"
              onClick={() => { setBypassDuplicate(true); setDuplicateSuggestion(null) }}
              className="px-3 py-1.5 border border-amber-300 text-amber-700 text-xs font-medium rounded-lg hover:bg-amber-100 transition"
            >
              เพิ่มต่อไป (ชื่อซ้ำ)
            </button>
          </div>
        </div>
      )}

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

function Section({ title, children, noClip }: { title: string; children: React.ReactNode; noClip?: boolean }) {
  return (
    <div className={`bg-white rounded-xl border border-gray-100 shadow-sm ${noClip ? 'overflow-visible' : 'overflow-hidden'}`}>
      <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50/70 rounded-t-xl">
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
