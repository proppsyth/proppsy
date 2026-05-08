'use client'

import { useState, useTransition, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Sparkles, X, Plus, Upload, Loader2, ChevronDown, ChevronUp } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { ownerDisplayName } from '@/types'
import type { Stock, Owner, Project } from '@/types'
import { createStock, updateStock, parseStockTextWithEntities } from './actions'
import type { StockInput } from './actions'

// ─── Constants ───────────────────────────────────────────────

const ROOM_TYPES = ['Studio', '1BR', '2BR', '3BR', 'Penthouse', 'อื่นๆ']
const LISTING_TYPES = [
  { value: 'rent', label: 'ให้เช่า' },
  { value: 'sale', label: 'ขาย' },
  { value: 'both', label: 'ให้เช่า & ขาย' },
]
const STATUS_OPTIONS = [
  { value: 'available', label: 'ว่าง' },
  { value: 'rented', label: 'เช่าแล้ว' },
  { value: 'sold', label: 'ขายแล้ว' },
  { value: 'unavailable', label: 'ไม่ว่าง' },
]
const FURNITURE_OPTIONS = [
  'เตียง', 'โซฟา', 'โต๊ะทำงาน', 'เครื่องซักผ้า', 'ตู้เสื้อผ้า',
  'ไมโครเวฟ', 'ตู้เย็น', 'เครื่องปรับอากาศ', 'ทีวี', 'ชั้นวางของ',
  'เฟอร์นิเจอร์ครบ', 'กึ่งเฟอร์นิเจอร์',
]
const FACILITY_OPTIONS = [
  'สระว่ายน้ำ', 'ฟิตเนส', 'รักษาความปลอดภัย 24 ชม.', 'ที่จอดรถ',
  'รถรับส่ง BTS', 'รถรับส่ง MRT', 'ล็อบบี้', 'ร้านสะดวกซื้อ',
  'สวน', 'ห้องซาวนา', 'Co-working space', 'ห้องประชุม',
]

// ─── Types ───────────────────────────────────────────────────

type OwnerOption = Pick<Owner, 'id' | 'nickname' | 'first_name_th' | 'last_name_th' | 'phone'>
type ProjectOption = Pick<Project, 'id' | 'name_th' | 'name_en'>

interface FormState {
  project_name: string
  project_id: string
  owner_id: string
  unit_no: string
  unit_name: string
  building: string
  floor: string
  room_type: string
  size_sqm: string
  view_direction: string
  listing_type: string
  rent_price: string
  sale_price: string
  deposit: string
  contract_term: string
  furniture: string[]
  facilities: string[]
  status: string
  photo_urls: string[]
  notes: string
  contract_end_date: string
}

const DEFAULT: FormState = {
  project_name: '', project_id: '', owner_id: '',
  unit_no: '', unit_name: '', building: '', floor: '',
  room_type: '', size_sqm: '', view_direction: '',
  listing_type: 'rent', rent_price: '', sale_price: '',
  deposit: '2', contract_term: '12',
  furniture: [], facilities: [], status: 'available',
  photo_urls: [], notes: '', contract_end_date: '',
}

function stockToForm(s: Stock): FormState {
  return {
    project_name: s.project_name ?? '',
    project_id: s.project_id ?? '',
    owner_id: s.owner_id ?? '',
    unit_no: s.unit_no ?? '',
    unit_name: s.unit_name ?? '',
    building: s.building ?? '',
    floor: s.floor?.toString() ?? '',
    room_type: s.room_type ?? '',
    size_sqm: s.size_sqm?.toString() ?? '',
    view_direction: s.view_direction ?? '',
    listing_type: s.listing_type ?? 'rent',
    rent_price: s.rent_price?.toString() ?? '',
    sale_price: s.sale_price?.toString() ?? '',
    deposit: s.deposit?.toString() ?? '2',
    contract_term: s.contract_term?.toString() ?? '12',
    furniture: s.furniture ?? [],
    facilities: s.facilities ?? [],
    status: s.status ?? 'available',
    photo_urls: s.photo_urls ?? [],
    notes: s.notes ?? '',
    contract_end_date: s.contract_end_date ?? '',
  }
}

function toInput(f: FormState): StockInput {
  const n = (s: string) => s ? parseFloat(s) : undefined
  const i = (s: string) => s ? parseInt(s) : undefined
  return {
    project_name: f.project_name || undefined,
    project_id: f.project_id || null,
    owner_id: f.owner_id || null,
    unit_no: f.unit_no || undefined,
    unit_name: f.unit_name || undefined,
    building: f.building || undefined,
    floor: i(f.floor),
    room_type: f.room_type || undefined,
    size_sqm: n(f.size_sqm),
    view_direction: f.view_direction || undefined,
    listing_type: f.listing_type || 'rent',
    rent_price: n(f.rent_price),
    sale_price: n(f.sale_price),
    deposit: i(f.deposit) ?? 0,
    contract_term: i(f.contract_term) ?? 0,
    furniture: f.furniture,
    facilities: f.facilities,
    status: f.status || 'available',
    photo_urls: f.photo_urls,
    notes: f.notes || undefined,
    contract_end_date: f.contract_end_date || undefined,
  }
}

// ─── Main Component ───────────────────────────────────────────

interface Props {
  owners: OwnerOption[]
  projects: ProjectOption[]
  initialData?: Stock
  stockId?: string
  allowAI?: boolean
}

export default function StockForm({ owners, projects, initialData, stockId, allowAI = true }: Props) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [form, setForm] = useState<FormState>(() =>
    initialData ? stockToForm(initialData) : DEFAULT
  )
  const [localOwners, setLocalOwners] = useState<OwnerOption[]>(owners)
  const [localProjects, setLocalProjects] = useState<ProjectOption[]>(projects)
  const [aiEntities, setAiEntities] = useState<{ ownerDisplay?: string; ownerCreated?: boolean; projectDisplay?: string; projectCreated?: boolean } | null>(null)
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(false)
  const [aiOpen, setAiOpen] = useState(!stockId)
  const [aiText, setAiText] = useState('')
  const [aiMsg, setAiMsg] = useState('')
  const [isSaving, startSave] = useTransition()
  const [isAIParsing, startAIParse] = useTransition()

  const isEdit = !!stockId
  const busy = isSaving || uploading

  // ── helpers
  function set<K extends keyof FormState>(key: K, val: FormState[K]) {
    setForm(f => ({ ...f, [key]: val }))
  }

  function setField<K extends keyof FormState>(key: K) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      set(key, e.target.value as FormState[K])
  }

  function toggle(key: 'furniture' | 'facilities', item: string) {
    setForm(f => ({
      ...f,
      [key]: f[key].includes(item) ? f[key].filter(x => x !== item) : [...f[key], item],
    }))
  }

  // ── AI parse with entity creation
  function handleAIParse() {
    if (!aiText.trim()) return
    setAiMsg('')
    setAiEntities(null)
    startAIParse(async () => {
      const res = await parseStockTextWithEntities(aiText)
      if ('error' in res) { setAiMsg(`❌ ${res.error}`); return }

      const { stock: s, owner_id, owner_created, owner_display, project_id, project_created, project_display } = res
      const filled = Object.entries(s).filter(([, v]) =>
        v !== null && v !== undefined && (Array.isArray(v) ? v.length > 0 : String(v).trim() !== '')
      ).length

      setForm(f => ({
        ...f,
        unit_no: s.unit_no ?? f.unit_no,
        building: s.building ?? f.building,
        floor: s.floor != null ? String(s.floor) : f.floor,
        room_type: s.room_type ?? f.room_type,
        size_sqm: s.size_sqm != null ? String(s.size_sqm) : f.size_sqm,
        view_direction: s.view_direction ?? f.view_direction,
        listing_type: s.listing_type ?? f.listing_type,
        rent_price: s.rent_price != null ? String(s.rent_price) : f.rent_price,
        sale_price: s.sale_price != null ? String(s.sale_price) : f.sale_price,
        deposit: s.deposit != null ? String(s.deposit) : f.deposit,
        contract_term: s.contract_term != null ? String(s.contract_term) : f.contract_term,
        furniture: s.furniture?.length ? s.furniture : f.furniture,
        facilities: s.facilities?.length ? s.facilities : f.facilities,
        notes: s.notes ?? f.notes,
        owner_id: owner_id ?? f.owner_id,
        project_id: project_id ?? f.project_id,
        project_name: s.project_name ?? f.project_name,
      }))

      // Add newly created owner/project to local lists so dropdowns reflect them
      if (owner_id && !localOwners.find(o => o.id === owner_id)) {
        const nameParts = (owner_display ?? '').split(' ')
        setLocalOwners(prev => [...prev, {
          id: owner_id,
          first_name_th: nameParts[0] ?? owner_display ?? '',
          last_name_th: nameParts.slice(1).join(' '),
          nickname: undefined,
          phone: undefined,
        }])
      }
      if (project_id && project_display && !localProjects.find(p => p.id === project_id)) {
        setLocalProjects(prev => [...prev, { id: project_id, name_th: project_display, name_en: undefined }])
      }

      setAiEntities({ ownerDisplay: owner_display, ownerCreated: owner_created, projectDisplay: project_display, projectCreated: project_created })
      setAiMsg(`✓ เติมข้อมูล ${filled} ฟิลด์แล้ว`)
      setAiOpen(false)
    })
  }

  // ── photo upload
  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files?.length) return
    setUploading(true)
    const supabase = createClient()
    const newUrls: string[] = []
    for (const file of Array.from(files)) {
      const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
      const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error: upErr } = await supabase.storage
        .from('stock-photos')
        .upload(path, file, { contentType: file.type })
      if (!upErr) {
        const { data } = supabase.storage.from('stock-photos').getPublicUrl(path)
        newUrls.push(data.publicUrl)
      }
    }
    setForm(f => ({ ...f, photo_urls: [...f.photo_urls, ...newUrls] }))
    setUploading(false)
    e.target.value = ''
  }

  // ── submit
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const input = toInput(form)
    startSave(async () => {
      if (isEdit) {
        const res = await updateStock(stockId!, input)
        if (res.error) { setError(res.error); return }
        router.push(`/stock/${stockId}`)
      } else {
        const res = await createStock(input)
        if (res.error) { setError(res.error); return }
        router.push(`/stock/${res.id}`)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-4xl">

      {/* ── AI Section ────────────────────────────────────── */}
      {!allowAI ? (
        <div className="bg-gray-50 border border-gray-200 rounded-xl px-5 py-4 flex items-center gap-3">
          <Sparkles className="w-4 h-4 text-gray-300 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-gray-400">AI Smart Paste</p>
            <p className="text-xs text-gray-400">ฟีเจอร์นี้รองรับเฉพาะแพ็กเกจ Professional ขึ้นไป</p>
          </div>
        </div>
      ) : (
      <div className="bg-gradient-to-r from-violet-50 to-blue-50 border border-violet-200 rounded-xl overflow-hidden">
        <button
          type="button"
          onClick={() => setAiOpen(o => !o)}
          className="w-full flex items-center justify-between px-5 py-3.5 text-left"
        >
          <span className="flex items-center gap-2 font-semibold text-violet-700 text-sm">
            <Sparkles className="w-4 h-4" />
            วิเคราะห์ข้อความด้วย AI
            <span className="text-xs font-normal text-violet-500">วาง/พิมพ์ประกาศแล้วให้ AI เติมฟอร์มให้อัตโนมัติ</span>
          </span>
          {aiOpen ? <ChevronUp className="w-4 h-4 text-violet-500" /> : <ChevronDown className="w-4 h-4 text-violet-500" />}
        </button>

        {aiOpen && (
          <div className="px-5 pb-5 space-y-3">
            <textarea
              value={aiText}
              onChange={e => setAiText(e.target.value)}
              rows={5}
              placeholder="วางข้อความประกาศที่นี่... เช่น ให้เช่าคอนโด Lumpini Suite ชั้น 15 ห้อง 502 ขนาด 35 ตร.ม. ราคา 15,000 บาท/เดือน..."
              className="w-full px-3 py-2.5 border border-violet-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white resize-none"
            />
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleAIParse}
                disabled={isAIParsing || !aiText.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 disabled:bg-violet-300 text-white text-sm font-medium rounded-lg transition"
              >
                {isAIParsing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {isAIParsing ? 'กำลังวิเคราะห์...' : 'วิเคราะห์'}
              </button>
              {aiMsg && (
                <span className={`text-sm font-medium ${aiMsg.startsWith('✓') ? 'text-green-600' : 'text-red-500'}`}>
                  {aiMsg}
                </span>
              )}
            </div>
            {aiEntities && (aiEntities.ownerDisplay || aiEntities.projectDisplay) && (
              <div className="text-xs text-violet-700 space-y-0.5 pt-1">
                {aiEntities.ownerDisplay && (
                  <p>👤 เจ้าของ: <strong>{aiEntities.ownerDisplay}</strong>{aiEntities.ownerCreated ? ' (สร้างใหม่)' : ' (พบในระบบ)'}</p>
                )}
                {aiEntities.projectDisplay && (
                  <p>🏢 โครงการ: <strong>{aiEntities.projectDisplay}</strong>{aiEntities.projectCreated ? ' (สร้างใหม่)' : ' (พบในระบบ)'}</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
      )}

      {/* ── Project & Unit ──────────────────────────────────── */}
      <Section title="โครงการ & ยูนิต">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <Label text="โครงการ" />
            <input
              list="projects-list"
              value={form.project_name}
              onChange={e => {
                const name = e.target.value
                const match = localProjects.find(p => p.name_th === name)
                setForm(f => ({ ...f, project_name: name, project_id: match?.id ?? '' }))
              }}
              placeholder="ค้นหาหรือพิมพ์ชื่อโครงการ..."
              className={INPUT_CLS}
            />
            <datalist id="projects-list">
              {localProjects.map(p => <option key={p.id} value={p.name_th} />)}
            </datalist>
          </div>
          <div>
            <Label text="ห้อง / ยูนิต" />
            <input value={form.unit_no} onChange={setField('unit_no')} placeholder="เช่น 502, A-15" className={INPUT_CLS} />
          </div>
          <div>
            <Label text="ชื่อห้อง (ถ้ามี)" />
            <input value={form.unit_name} onChange={setField('unit_name')} placeholder="เช่น เรือนมะลิ" className={INPUT_CLS} />
          </div>
          <div>
            <Label text="อาคาร / ตึก" />
            <input value={form.building} onChange={setField('building')} placeholder="เช่น A, B, Tower 1" className={INPUT_CLS} />
          </div>
          <div>
            <Label text="ชั้น" />
            <input value={form.floor} onChange={setField('floor')} type="number" min="1" placeholder="5" className={INPUT_CLS} />
          </div>
          <div>
            <Label text="ประเภทห้อง" />
            <select value={form.room_type} onChange={setField('room_type')} className={INPUT_CLS}>
              <option value="">-- เลือก --</option>
              {ROOM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <Label text="ขนาด (ตร.ม.)" />
            <input value={form.size_sqm} onChange={setField('size_sqm')} type="number" step="0.5" min="0" placeholder="35" className={INPUT_CLS} />
          </div>
          <div>
            <Label text="ทิศหน้าห้อง" />
            <input value={form.view_direction} onChange={setField('view_direction')} placeholder="เช่น ตะวันออก, เมือง" className={INPUT_CLS} />
          </div>
        </div>
      </Section>

      {/* ── Pricing ──────────────────────────────────────────── */}
      <Section title="ราคาและสัญญา">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <Label text="ประเภทลิสติ้ง" />
            <div className="flex gap-2 flex-wrap">
              {LISTING_TYPES.map(t => (
                <button key={t.value} type="button" onClick={() => set('listing_type', t.value)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium border transition ${
                    form.listing_type === t.value
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'border-gray-200 text-gray-700 hover:border-gray-300'
                  }`}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          {form.listing_type !== 'sale' && (
            <div>
              <Label text="ค่าเช่า / เดือน (บาท)" />
              <input value={form.rent_price} onChange={setField('rent_price')} type="number" min="0" placeholder="15000" className={INPUT_CLS} />
            </div>
          )}
          {form.listing_type !== 'rent' && (
            <div>
              <Label text="ราคาขาย (บาท)" />
              <input value={form.sale_price} onChange={setField('sale_price')} type="number" min="0" placeholder="3500000" className={INPUT_CLS} />
            </div>
          )}
          <div>
            <Label text="เงินมัดจำ (จำนวนเดือน)" />
            <input value={form.deposit} onChange={setField('deposit')} type="number" min="0" placeholder="2" className={INPUT_CLS} />
          </div>
          <div>
            <Label text="ระยะสัญญา (เดือน)" />
            <input value={form.contract_term} onChange={setField('contract_term')} type="number" min="0" placeholder="12" className={INPUT_CLS} />
          </div>
        </div>
      </Section>

      {/* ── Owner ────────────────────────────────────────────── */}
      <Section title="เจ้าของทรัพย์">
        <Label text="เลือกเจ้าของ" />
        <select value={form.owner_id} onChange={setField('owner_id')} className={INPUT_CLS}>
          <option value="">-- ไม่ระบุ --</option>
          {localOwners.map(o => (
            <option key={o.id} value={o.id}>
              {ownerDisplayName(o)}{o.phone ? ` — ${o.phone}` : ''}
            </option>
          ))}
        </select>
      </Section>

      {/* ── Furniture ────────────────────────────────────────── */}
      <Section title="เฟอร์นิเจอร์">
        <TagGroup
          options={FURNITURE_OPTIONS}
          selected={form.furniture}
          onToggle={item => toggle('furniture', item)}
          onAdd={item => set('furniture', [...form.furniture, item])}
          onRemove={item => set('furniture', form.furniture.filter(x => x !== item))}
        />
      </Section>

      {/* ── Facilities ───────────────────────────────────────── */}
      <Section title="สิ่งอำนวยความสะดวก">
        <TagGroup
          options={FACILITY_OPTIONS}
          selected={form.facilities}
          onToggle={item => toggle('facilities', item)}
          onAdd={item => set('facilities', [...form.facilities, item])}
          onRemove={item => set('facilities', form.facilities.filter(x => x !== item))}
          chipColor="blue"
        />
      </Section>

      {/* ── Photos ───────────────────────────────────────────── */}
      <Section title="รูปภาพ">
        <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoUpload} />
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 px-4 py-2.5 border-2 border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50 text-gray-500 hover:text-blue-600 text-sm rounded-xl transition disabled:opacity-50"
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {uploading ? 'กำลังอัปโหลด...' : 'เลือกรูปภาพ (หลายไฟล์ได้)'}
          </button>

          {form.photo_urls.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
              {form.photo_urls.map((url, i) => (
                <div key={url} className="relative aspect-square rounded-lg overflow-hidden group">
                  <Image src={url} alt={`photo ${i + 1}`} fill className="object-cover" sizes="120px" />
                  <button
                    type="button"
                    onClick={() => set('photo_urls', form.photo_urls.filter(u => u !== url))}
                    className="absolute top-1 right-1 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center transition sm:opacity-0 sm:group-hover:opacity-100"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                  {i === 0 && (
                    <span className="absolute bottom-1 left-1 text-xs bg-black/60 text-white px-1.5 py-0.5 rounded">หลัก</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </Section>

      {/* ── Status & Notes ───────────────────────────────────── */}
      <Section title="สถานะและหมายเหตุ">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label text="สถานะ" />
            <select value={form.status} onChange={setField('status')} className={INPUT_CLS}>
              {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <Label text="วันสัญญาสิ้นสุด" />
            <input value={form.contract_end_date} onChange={setField('contract_end_date')} type="date" className={INPUT_CLS} />
          </div>
          <div className="sm:col-span-2">
            <Label text="หมายเหตุ" />
            <textarea
              value={form.notes}
              onChange={setField('notes')}
              rows={3}
              placeholder="ข้อมูลเพิ่มเติม..."
              className={`${INPUT_CLS} resize-none`}
            />
          </div>
        </div>
      </Section>

      {/* ── Error + Submit ───────────────────────────────────── */}
      {error && (
        <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="flex items-center gap-3 pb-8">
        <button
          type="button"
          onClick={() => router.back()}
          disabled={busy}
          className="px-5 py-2.5 border border-gray-200 text-gray-600 text-sm font-medium rounded-xl hover:bg-gray-50 transition disabled:opacity-50"
        >
          ยกเลิก
        </button>
        <button
          type="submit"
          disabled={busy}
          className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm font-medium rounded-xl transition"
        >
          {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
          {isSaving ? 'กำลังบันทึก...' : isEdit ? 'บันทึกการแก้ไข' : 'เพิ่มทรัพย์'}
        </button>
      </div>
    </form>
  )
}

// ─── Shared style ────────────────────────────────────────────

const INPUT_CLS = 'w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition bg-white'

// ─── Sub-components ───────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/70">
        <h2 className="text-sm font-semibold text-gray-700">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

function Label({ text }: { text: string }) {
  return <p className="text-xs font-medium text-gray-600 mb-1.5">{text}</p>
}

interface TagGroupProps {
  options: string[]
  selected: string[]
  onToggle: (item: string) => void
  onAdd: (item: string) => void
  onRemove: (item: string) => void
  chipColor?: 'gray' | 'blue'
}

function TagGroup({ options, selected, onToggle, onAdd, onRemove, chipColor = 'gray' }: TagGroupProps) {
  const [custom, setCustom] = useState('')
  const customItems = selected.filter(s => !options.includes(s))

  function addCustom() {
    const v = custom.trim()
    if (v && !selected.includes(v)) { onAdd(v); setCustom('') }
  }

  return (
    <div className="space-y-3">
      {/* Preset options */}
      <div className="flex flex-wrap gap-2">
        {options.map(item => {
          const active = selected.includes(item)
          return (
            <button key={item} type="button" onClick={() => onToggle(item)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${
                active
                  ? chipColor === 'blue'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-gray-800 text-white border-gray-800'
                  : 'border-gray-200 text-gray-700 hover:border-gray-400'
              }`}>
              {item}
            </button>
          )
        })}
      </div>

      {/* Custom items */}
      {customItems.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {customItems.map(item => (
            <span key={item} className="flex items-center gap-1 px-3 py-1.5 bg-green-100 text-green-800 text-xs rounded-full border border-green-200">
              {item}
              <button type="button" onClick={() => onRemove(item)}><X className="w-3 h-3" /></button>
            </span>
          ))}
        </div>
      )}

      {/* Custom input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={custom}
          onChange={e => setCustom(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustom() } }}
          placeholder="เพิ่มเอง... (กด Enter)"
          className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
        />
        <button type="button" onClick={addCustom}
          className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition">
          <Plus className="w-4 h-4 text-gray-600" />
        </button>
      </div>
    </div>
  )
}
