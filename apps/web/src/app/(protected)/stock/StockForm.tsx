'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Sparkles, X, Plus, Loader2, ChevronDown, ChevronUp, UserPlus, Search } from 'lucide-react'
import { formatRoomType } from '@/types'
import type { Stock, Project } from '@/types'
import { createStock, updateStock, parseStockTextWithEntities, checkOwnerDuplicate } from './actions'
import type { StockInput } from './actions'
import { searchProjects } from '@/app/(protected)/projects/actions'
import type { ProjectSearchResult } from '@/app/(protected)/projects/actions'
import { usePropertyImages } from '@/hooks/useUpload'
import ImageUploader from '@/components/shared/ImageUploader'
import { useAiQuota } from '@/hooks/useAiQuota'
import { AiQuotaBadge } from '@/components/shared/AiQuotaBadge'
import { AiLimitModal } from '@/components/shared/AiLimitModal'
import EntityCombobox from '@/components/shared/EntityCombobox'
import { searchOwners } from '@/app/(protected)/contracts/search-actions'
import type { OwnerSearchResult } from '@/app/(protected)/contracts/search-actions'
import OwnerDrawer from '@/app/(protected)/contracts/OwnerDrawer'
import QuickProjectModal from './QuickProjectModal'

// ─── Constants ───────────────────────────────────────────────

const ROOM_TYPES = ['Studio', '1BR', '2BR', '3BR', 'Penthouse', 'อื่นๆ']
const CUSTOM_ROOM_TYPES_KEY = 'proppsy_custom_room_types'
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

type ProjectOption = Pick<Project, 'id' | 'name_th' | 'name_en'>

interface FormState {
  project_name: string
  project_id: string
  owner_id: string
  owner_label: string
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
  co_agent_accepted: boolean
  status: string
  notes: string
  contract_end_date: string
}

const DEFAULT: FormState = {
  project_name: '', project_id: '', owner_id: '', owner_label: '',
  unit_no: '', unit_name: '', building: '', floor: '',
  room_type: '', size_sqm: '', view_direction: '',
  listing_type: 'rent', rent_price: '', sale_price: '',
  deposit: '1', contract_term: '12',
  furniture: [], facilities: [], co_agent_accepted: false,
  status: 'available', notes: '', contract_end_date: '',
}

function stockToForm(s: Stock): FormState {
  return {
    project_name: s.project_name ?? '',
    project_id: s.project_id ?? '',
    owner_id: s.owner_id ?? '',
    owner_label: '',
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
    co_agent_accepted: s.co_agent_accepted ?? false,
    status: s.status ?? 'available',
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
    floor: f.floor || undefined,
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
    co_agent_accepted: f.co_agent_accepted,
    status: f.status || 'available',
    photo_urls: [],
    notes: f.notes || undefined,
    contract_end_date: f.contract_end_date || undefined,
  }
}

function ownerLabel(r: OwnerSearchResult): string {
  return r.nickname || [r.first_name_th, r.last_name_th].filter(Boolean).join(' ') || r.id
}

// ─── Main Component ───────────────────────────────────────────

interface Props {
  initialData?: Stock
  stockId?: string
  allowAI?: boolean
  initialOwnerLabel?: string
}

export default function StockForm({ initialData, stockId, allowAI = true, initialOwnerLabel }: Props) {
  const router = useRouter()
  const [form, setForm] = useState<FormState>(() =>
    initialData
      ? { ...stockToForm(initialData), owner_label: initialOwnerLabel ?? '' }
      : DEFAULT
  )
  const [localProjects, setLocalProjects] = useState<ProjectOption[]>([])
  const [aiEntities, setAiEntities] = useState<{ ownerDisplay?: string; ownerCreated?: boolean; projectDisplay?: string; projectCreated?: boolean } | null>(null)
  const [error, setError] = useState('')
  const [aiOpen, setAiOpen] = useState(!stockId)
  const [aiText, setAiText] = useState('')
  const [aiMsg, setAiMsg] = useState('')
  const [isSaving, startSave] = useTransition()
  const [isAIParsing, startAIParse] = useTransition()
  const [showLimitModal, setShowLimitModal] = useState(false)
  const [showQuickOwner, setShowQuickOwner] = useState(false)
  const [showQuickProject, setShowQuickProject] = useState(false)
  const [dupWarning, setDupWarning] = useState<string | null>(null)
  const [customRoomTypes, setCustomRoomTypes] = useState<string[]>([])
  const [addingRoomType, setAddingRoomType] = useState(false)
  const [newRoomTypeText, setNewRoomTypeText] = useState('')
  const dupCheckTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { quota, refresh: refreshQuota, isExhausted } = useAiQuota()

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
      if (prev.includes(val) || ROOM_TYPES.includes(val)) return prev
      const next = [...prev, val]
      try { localStorage.setItem(CUSTOM_ROOM_TYPES_KEY, JSON.stringify(next)) } catch { /* ignore */ }
      return next
    })
    set('room_type', val)
    setNewRoomTypeText('')
    setAddingRoomType(false)
  }

  useEffect(() => {
    setDupWarning(null)
    if (!form.owner_id || !form.project_id) return
    if (dupCheckTimer.current) clearTimeout(dupCheckTimer.current)
    dupCheckTimer.current = setTimeout(async () => {
      const res = await checkOwnerDuplicate(form.owner_id, form.project_id, stockId)
      if (res.isDuplicate) {
        setDupWarning(`เจ้าของนี้ลิงก์กับห้อง ${res.conflictUnit ?? ''} ในโครงการนี้อยู่แล้ว — กรุณาตรวจสอบก่อนบันทึก`)
      }
    }, 600)
    return () => { if (dupCheckTimer.current) clearTimeout(dupCheckTimer.current) }
  }, [form.owner_id, form.project_id, stockId])

  const photoState = usePropertyImages({
    stockId,
    initialMainUrls: initialData?.photo_urls,
    initialThumbUrls: initialData?.photo_thumb_urls,
  })

  const isEdit = !!stockId
  const uploadBusy = photoState.progress.phase === 'processing' || photoState.progress.phase === 'uploading'
  const busy = isSaving || uploadBusy

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

  function handleOwnerSelect(r: OwnerSearchResult | null) {
    if (!r) {
      setForm(f => ({ ...f, owner_id: '', owner_label: '' }))
      return
    }
    setForm(f => ({ ...f, owner_id: r.id, owner_label: ownerLabel(r) }))
  }

  function handleOwnerCreated(id: string, label: string) {
    setForm(f => ({ ...f, owner_id: id, owner_label: label }))
    setShowQuickOwner(false)
  }

  function handleProjectCreated(id: string, name: string) {
    setLocalProjects(prev => [...prev, { id, name_th: name, name_en: undefined }])
    setForm(f => ({ ...f, project_id: id, project_name: name }))
    setShowQuickProject(false)
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
        owner_label: owner_id ? (owner_display ?? f.owner_label) : f.owner_label,
        project_id: project_id ?? f.project_id,
        project_name: s.project_name ?? f.project_name,
      }))

      if (project_id && project_display && !localProjects.find(p => p.id === project_id)) {
        setLocalProjects(prev => [...prev, { id: project_id, name_th: project_display, name_en: undefined }])
      }

      setAiEntities({ ownerDisplay: owner_display, ownerCreated: owner_created, projectDisplay: project_display, projectCreated: project_created })
      setAiMsg(`✓ เติมข้อมูล ${filled} ฟิลด์แล้ว`)
      setAiOpen(false)
      refreshQuota()
    })
  }

  // ── submit
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!form.project_id) { setError('กรุณาเลือกโครงการจากรายการก่อนบันทึก'); return }
    if (!form.owner_id) { setError('กรุณาเลือกเจ้าของทรัพย์ก่อนบันทึก'); return }
    const input: StockInput = {
      ...toInput(form),
      photo_urls: photoState.mainUrls,
      photo_thumb_urls: photoState.thumbUrls,
    }
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
    <>
    <form onSubmit={handleSubmit} className="space-y-4 max-w-4xl">

      {/* ── AI Section ────────────────────────────────────── */}
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
          <div className="flex items-center gap-2">
            {quota && !aiOpen && <AiQuotaBadge used={quota.used} limit={quota.limit} />}
            {aiOpen ? <ChevronUp className="w-4 h-4 text-violet-500" /> : <ChevronDown className="w-4 h-4 text-violet-500" />}
          </div>
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
            <div className="flex items-center gap-3 flex-wrap">
              <button
                type="button"
                onClick={() => {
                  if (isExhausted) { setShowLimitModal(true); return }
                  handleAIParse()
                }}
                disabled={isAIParsing || !aiText.trim()}
                className={`flex items-center gap-2 px-4 py-2 text-white text-sm font-medium rounded-lg transition disabled:opacity-50 ${isExhausted ? 'bg-gray-400 cursor-not-allowed' : 'bg-violet-600 hover:bg-violet-700'}`}
              >
                {isAIParsing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {isAIParsing ? 'กำลังวิเคราะห์...' : 'วิเคราะห์'}
              </button>
              {quota && <AiQuotaBadge used={quota.used} limit={quota.limit} />}
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
      {showLimitModal && quota && (
        <AiLimitModal quota={quota} onClose={() => setShowLimitModal(false)} />
      )}

      {/* ── Project & Unit ──────────────────────────────────── */}
      <Section title="โครงการ & ยูนิต">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <Label text="โครงการ" />
            <ProjectCombobox
              value={form.project_id}
              displayName={form.project_name}
              localOptions={localProjects}
              onSelect={(id, name) => setForm(f => ({ ...f, project_id: id, project_name: name }))}
            />
            {form.project_id ? (
              <p className="mt-1.5 text-xs text-green-600">
                ✓ ลิงก์กับโครงการในระบบแล้ว ({form.project_id}) — ข้อมูลโครงการจะแสดงบนหน้าประกาศ
              </p>
            ) : (
              <div className="mt-1.5 flex items-center justify-between">
                <p className="text-xs text-amber-600">⚠ ต้องเลือกโครงการจากรายการก่อนบันทึก</p>
                <button
                  type="button"
                  onClick={() => setShowQuickProject(true)}
                  className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  เพิ่มโครงการใหม่
                </button>
              </div>
            )}
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
            <input value={form.floor} onChange={setField('floor')} type="text" placeholder="เช่น 5 หรือ 12A" className={INPUT_CLS} />
          </div>
          <div>
            <Label text="ประเภทห้อง" />
            {addingRoomType ? (
              <div className="flex gap-2">
                <input
                  autoFocus
                  value={newRoomTypeText}
                  onChange={e => setNewRoomTypeText(e.target.value)}
                  placeholder="เช่น Duplex / ดูเพล็กซ์"
                  className={INPUT_CLS}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddCustomRoomType() } }}
                />
                <button type="button" onClick={handleAddCustomRoomType} className="px-3 rounded-lg bg-blue-600 text-white text-sm font-medium shrink-0">เพิ่ม</button>
                <button type="button" onClick={() => { setAddingRoomType(false); setNewRoomTypeText('') }} className="px-3 rounded-lg border border-gray-200 text-gray-500 text-sm shrink-0">ยกเลิก</button>
              </div>
            ) : (
              <select
                value={form.room_type}
                onChange={e => {
                  if (e.target.value === '__add_new__') { setAddingRoomType(true); return }
                  set('room_type', e.target.value)
                }}
                className={INPUT_CLS}
              >
                <option value="">-- เลือก --</option>
                {ROOM_TYPES.map(t => <option key={t} value={t}>{formatRoomType(t)}</option>)}
                {customRoomTypes.map(t => <option key={t} value={t}>{t}</option>)}
                <option value="__add_new__">+ เพิ่มประเภทห้องใหม่...</option>
              </select>
            )}
          </div>
          <div>
            <Label text="ขนาด (ตร.ม.)" />
            <input value={form.size_sqm} onChange={setField('size_sqm')} type="number" step="0.01" min="0" placeholder="35" className={INPUT_CLS} />
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
        <div className="space-y-2">
          <Label text="เจ้าของ" />
          <EntityCombobox
            kind="owner"
            value={form.owner_id}
            selectedLabel={form.owner_label}
            onSelect={handleOwnerSelect}
            searchFn={searchOwners}
            placeholder="ค้นหาชื่อ, เบอร์โทร, ชื่อเล่น..."
          />
          {form.owner_id ? (
            <p className="text-xs flex items-center gap-1 text-green-600">
              ✓ ลิงก์กับเจ้าของในระบบแล้ว ({form.owner_id})
            </p>
          ) : (
            <div className="flex items-center justify-between">
              <p className="text-xs text-amber-600">⚠ ต้องเลือกเจ้าของทรัพย์ก่อนบันทึก</p>
              <button
                type="button"
                onClick={() => setShowQuickOwner(true)}
                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium transition"
              >
                <UserPlus className="w-3.5 h-3.5" />
                เพิ่มเจ้าของใหม่
              </button>
            </div>
          )}
          {dupWarning && (
            <div className="flex items-start gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-100 px-3 py-2 rounded-lg">
              ⚠ {dupWarning}
            </div>
          )}
        </div>
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
        <ImageUploader {...photoState} />
      </Section>

      {/* ── Co-Agent ─────────────────────────────────────────── */}
      <Section title="ความร่วมมือ">
        <label className="flex items-center gap-3 cursor-pointer w-fit">
          <input
            type="checkbox"
            checked={form.co_agent_accepted}
            onChange={e => set('co_agent_accepted', e.target.checked)}
            className="w-4 h-4 rounded accent-blue-600"
          />
          <span className="text-sm text-gray-700">รับ Co-Agent (ยินดีทำงานร่วมกับเอเจนต์อื่น)</span>
        </label>
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
          {form.status === 'rented' && (
            <div>
              <Label text="วันสัญญาสิ้นสุด" />
              <input value={form.contract_end_date} onChange={setField('contract_end_date')} type="date" className={INPUT_CLS} />
            </div>
          )}
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

    {showQuickOwner && (
      <OwnerDrawer
        onCreated={handleOwnerCreated}
        onClose={() => setShowQuickOwner(false)}
      />
    )}
    {showQuickProject && (
      <QuickProjectModal
        initialName={form.project_name}
        onCreated={handleProjectCreated}
        onClose={() => setShowQuickProject(false)}
      />
    )}
    </>
  )
}

// ─── Shared style ────────────────────────────────────────────

const INPUT_CLS = 'w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition bg-white'

// ─── Sub-components ───────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-visible">
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

// ─── Project Combobox (async search) ─────────────────────────

interface ProjectComboboxProps {
  value: string
  displayName: string
  localOptions: ProjectOption[]
  onSelect: (id: string, name: string) => void
}

function ProjectCombobox({ value: _value, displayName, localOptions, onSelect }: ProjectComboboxProps) {
  const [query, setQuery] = useState(displayName)
  const [results, setResults] = useState<ProjectSearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null)
  const wrapRef = useRef<HTMLDivElement>(null)

  // Sync display name from parent (e.g. AI fill)
  useEffect(() => { setQuery(displayName) }, [displayName])

  // Close on outside click
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  function handleInput(q: string) {
    setQuery(q)
    onSelect('', q)
    if (debounce.current) clearTimeout(debounce.current)
    if (!q.trim()) { setResults([]); setOpen(false); return }
    setOpen(true)
    debounce.current = setTimeout(async () => {
      setLoading(true)
      try {
        const remote = await searchProjects(q)
        // Prepend local additions not yet in DB (AI-created, QuickProjectModal)
        const localMatched = localOptions.filter(
          p => (p.name_th.includes(q) || (p.name_en ?? '').toLowerCase().includes(q.toLowerCase()))
            && !remote.find(r => r.id === p.id)
        )
        const merged: ProjectSearchResult[] = [
          ...localMatched.map(p => ({ id: p.id, name_th: p.name_th, name_en: p.name_en ?? null })),
          ...remote,
        ]
        setResults(merged)
      } finally {
        setLoading(false)
      }
    }, 300)
  }

  function handleSelect(r: ProjectSearchResult) {
    const label = r.name_en ?? r.name_th
    setQuery(label)
    onSelect(r.id, r.name_th)
    setOpen(false)
  }

  return (
    <div ref={wrapRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={e => handleInput(e.target.value)}
          onFocus={() => { if (query.trim()) setOpen(true) }}
          placeholder="ค้นหาชื่อโครงการ (ไทย / EN)..."
          className={`${INPUT_CLS} pl-8`}
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 animate-spin" />
        )}
      </div>
      {open && results.length > 0 && (
        <ul className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden max-h-64 overflow-y-auto">
          {results.map(r => (
            <li key={r.id}>
              <button
                type="button"
                onMouseDown={() => handleSelect(r)}
                className="w-full px-4 py-2.5 text-left hover:bg-blue-50 transition"
              >
                <p className="text-sm font-medium text-gray-900 leading-tight">{r.name_en ?? r.name_th}</p>
                {r.name_en && r.name_th !== r.name_en && (
                  <p className="text-xs text-gray-500 mt-0.5">{r.name_th}</p>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
      {open && !loading && results.length === 0 && query.trim().length >= 2 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg px-4 py-3">
          <p className="text-sm text-gray-500">ไม่พบโครงการ &ldquo;{query}&rdquo;</p>
        </div>
      )}
    </div>
  )
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
