'use client'

import { useState, useTransition, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ScanLine, Loader2, PenLine, Upload } from 'lucide-react'
import type { Customer } from '@/types'
import { createCustomer, updateCustomer, parseDocument } from './actions'
import { compressForOcr } from '@/lib/compressForOcr'
import type { CustomerInput } from './actions'
import AddressSelector from '@/components/shared/AddressSelector'
import SignaturePad from '@/components/shared/SignaturePad'
import { useDocumentUpload } from '@/hooks/useUpload'
import DocumentUploader from '@/components/shared/DocumentUploader'
import { useAiQuota } from '@/hooks/useAiQuota'
import { AiQuotaBadge } from '@/components/shared/AiQuotaBadge'
import { AiLimitModal } from '@/components/shared/AiLimitModal'

// ─── Constants ───────────────────────────────────────────────

const PREFIX_SYNC: Record<string, string> = { นาย: 'Mr.', นาง: 'Mrs.', นางสาว: 'Ms.' }
const PREFIXES_TH = ['นาย', 'นาง', 'นางสาว']
const PREFIXES_EN = ['Mr.', 'Mrs.', 'Miss', 'Ms.']
const KNOWN_SOURCES = ['line_oa', 'facebook', 'instagram', 'tiktok', 'website', 'referral', 'walk_in', 'online', 'other']
const LEAD_STATUS_OPTIONS = [
  { value: 'lead',        label: 'Lead' },
  { value: 'prospect',    label: 'Prospect' },
  { value: 'viewing',     label: 'นัดชม' },
  { value: 'negotiating', label: 'เจรจา' },
  { value: 'converted',   label: 'ปิดดีล' },
  { value: 'lost',        label: 'เสียลูกค้า' },
]
const SOURCE_OPTIONS = [
  { value: 'line_oa', label: 'LINE OA' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'website', label: 'Website' },
  { value: 'referral', label: 'แนะนำ' },
  { value: 'walk_in', label: 'Walk-in' },
  { value: 'online', label: 'ออนไลน์' },
  { value: 'other', label: 'อื่นๆ' },
]

// ─── Types ───────────────────────────────────────────────────

interface FormState {
  prefix: string
  prefix_en: string
  first_name_th: string
  last_name_th: string
  first_name_en: string
  last_name_en: string
  nickname: string
  phone: string
  line_id: string
  national_id: string
  source: string
  source_other: string
  lead_status: string
  follow_up: boolean
  address_no: string
  moo: string
  address_road: string
  province: string
  district: string
  subdistrict: string
  zip: string
  notes: string
}

const DEFAULT: FormState = {
  prefix: '', prefix_en: '', first_name_th: '', last_name_th: '',
  first_name_en: '', last_name_en: '', nickname: '',
  phone: '', line_id: '', national_id: '',
  source: '', source_other: '', lead_status: 'lead', follow_up: false,
  address_no: '', moo: '', address_road: '',
  province: '', district: '', subdistrict: '', zip: '',
  notes: '',
}

function customerToForm(c: Customer): FormState {
  const rawSource = c.source ?? ''
  const isKnown = KNOWN_SOURCES.includes(rawSource)
  return {
    prefix: c.prefix ?? '',
    prefix_en: c.prefix_en ?? '',
    first_name_th: c.first_name_th ?? '',
    last_name_th: c.last_name_th ?? '',
    first_name_en: c.first_name_en ?? '',
    last_name_en: c.last_name_en ?? '',
    nickname: c.nickname ?? '',
    phone: c.phone ?? '',
    line_id: c.line_id ?? '',
    national_id: c.national_id ?? '',
    source: isKnown ? rawSource : (rawSource ? 'other' : ''),
    source_other: !isKnown ? rawSource : '',
    lead_status: c.lead_status ?? 'lead',
    follow_up: c.follow_up ?? false,
    address_no: c.address_no ?? '',
    moo: c.moo ?? '',
    address_road: c.address_road ?? '',
    province: c.province ?? '',
    district: c.district ?? '',
    subdistrict: c.subdistrict ?? '',
    zip: c.zip ?? '',
    notes: c.notes ?? '',
  }
}

function toInput(f: FormState): CustomerInput {
  const str = (v: string) => v.trim() || undefined
  const resolvedSource = f.source === 'other'
    ? (f.source_other.trim() || undefined)
    : str(f.source)
  return {
    prefix: str(f.prefix),
    prefix_en: str(f.prefix_en),
    first_name_th: str(f.first_name_th),
    last_name_th: str(f.last_name_th),
    first_name_en: str(f.first_name_en),
    last_name_en: str(f.last_name_en),
    nickname: str(f.nickname),
    phone: str(f.phone),
    line_id: str(f.line_id),
    national_id: str(f.national_id),
    source: resolvedSource,
    lead_status: f.lead_status || undefined,
    follow_up: f.follow_up,
    address_no: str(f.address_no),
    moo: str(f.moo),
    address_road: str(f.address_road),
    province: str(f.province),
    district: str(f.district),
    subdistrict: str(f.subdistrict),
    zip: str(f.zip),
    notes: str(f.notes),
  }
}

// ─── Component ───────────────────────────────────────────────

interface Props {
  initialData?: Customer
  customerId?: string
}

export default function CustomerForm({ initialData, customerId }: Props) {
  const router = useRouter()
  const [form, setForm] = useState<FormState>(
    initialData ? customerToForm(initialData) : DEFAULT
  )
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()
  const [isOcrPending, startOcr] = useTransition()
  const [ocrMessage, setOcrMessage] = useState('')

  const [sigMode, setSigMode] = useState<'upload' | 'draw'>('upload')
  const [showLimitModal, setShowLimitModal] = useState(false)
  const { quota, refresh: refreshQuota, isExhausted } = useAiQuota()
  const ocrInputRef = useRef<HTMLInputElement>(null)

  const idCardState = useDocumentUpload({
    category: 'id-cards',
    entityId: customerId,
    isPrivate: true,
    enableWatermark: true,
    initialUrl: initialData?.id_card_url ?? '',
  })
  const sigState = useDocumentUpload({
    category: 'signatures',
    entityId: customerId,
    initialUrl: initialData?.signature_url ?? '',
  })

  const set = (k: keyof FormState, v: string | boolean) =>
    setForm(f => ({ ...f, [k]: v }))

  // ─── OCR ─────────────────────────────────────────────────

  function handleOcr(file: File) {
    setOcrMessage('')
    startOcr(async () => {
      const { base64, mimeType } = await compressForOcr(file)
      const result = await parseDocument(base64, mimeType)
      if ('error' in result) { setOcrMessage(result.error); return }

      const fields: string[] = []
      const apply = (k: keyof FormState, v: string | null | undefined) => {
        if (v) { set(k, v); fields.push(k) }
      }

      const isPassport = result.doc_type === 'passport'

      apply('prefix', result.prefix)
      apply('first_name_th', result.first_name_th)
      apply('last_name_th', result.last_name_th)
      apply('first_name_en', result.first_name_en)
      apply('last_name_en', result.last_name_en)
      apply('national_id', result.national_id)

      if (!isPassport) {
        apply('address_no', result.address_no)
        apply('moo', result.moo)
        apply('address_road', result.address_road)
        apply('province', result.province)
        apply('district', result.district)
        apply('subdistrict', result.subdistrict)
        apply('zip', result.zip)
      }

      await idCardState.upload(file)
      refreshQuota()

      const docLabel = isPassport ? 'พาสปอร์ต' : 'บัตรประชาชน'
      const extras: string[] = []
      if (isPassport) {
        if (result.nationality) extras.push(`สัญชาติ: ${result.nationality}`)
        if (result.gender) extras.push(`เพศ: ${result.gender === 'M' ? 'ชาย' : 'หญิง'}`)
        if (result.birth_date) extras.push(`วันเกิด: ${result.birth_date}`)
        if (result.expiry_date) extras.push(`หมดอายุ: ${result.expiry_date}`)
      }
      const extraNote = extras.length ? ` · ${extras.join(' · ')}` : ''
      setOcrMessage(`อ่าน${docLabel}สำเร็จ · กรอก ${fields.length} ช่อง${extraNote}`)
    })
  }

  // ─── Submit ──────────────────────────────────────────────

  function handleSubmit() {
    setError('')
    startTransition(async () => {
      const input: CustomerInput = {
        ...toInput(form),
        id_card_url: idCardState.url || undefined,
        signature_url: sigState.url || undefined,
      }
      if (customerId) {
        const res = await updateCustomer(customerId, input)
        if (res.error) { setError(res.error); return }
        router.push(`/customers/${customerId}`)
      } else {
        const res = await createCustomer(input)
        if (res.error) { setError(res.error); return }
        router.push(`/customers/${res.id}`)
      }
    })
  }

  // ─── Render ──────────────────────────────────────────────

  return (
    <div className="space-y-5">
      {/* OCR */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 bg-emerald-100/60 border-b border-emerald-200 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ScanLine className="w-4 h-4 text-emerald-700" />
            <span className="text-sm font-semibold text-emerald-800">OCR เอกสารตัวตน</span>
          </div>
          {quota && <AiQuotaBadge used={quota.used} limit={quota.limit} />}
        </div>
        <div className="p-4 space-y-3">
          <p className="text-xs text-emerald-700">ถ่ายภาพบัตรประชาชนหรือพาสปอร์ต ระบบจะกรอกข้อมูลให้อัตโนมัติ</p>
          <input
            ref={ocrInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={e => {
              const file = e.target.files?.[0]
              if (file) handleOcr(file)
              e.target.value = ''
            }}
          />
          <button
            type="button"
            onClick={() => {
              if (isExhausted) { setShowLimitModal(true); return }
              ocrInputRef.current?.click()
            }}
            disabled={isOcrPending}
            className={`flex items-center gap-2 px-4 py-2 text-white text-sm font-medium rounded-lg transition disabled:opacity-50 ${isExhausted ? 'bg-gray-400 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700'}`}
          >
            {isOcrPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ScanLine className="w-4 h-4" />}
            {isOcrPending ? 'กำลังอ่านข้อมูล...' : 'สแกนบัตร / พาสปอร์ต'}
          </button>
          {ocrMessage && (
            <p className={`text-xs font-medium ${ocrMessage.startsWith('อ่าน') ? 'text-emerald-700' : 'text-red-600'}`}>
              {ocrMessage}
            </p>
          )}
        </div>
      </div>
      {showLimitModal && quota && (
        <AiLimitModal quota={quota} onClose={() => setShowLimitModal(false)} />
      )}

      {/* ข้อมูลส่วนตัว */}
      <Section title="ข้อมูลส่วนตัว">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2 space-y-2">
            <div>
              <Label>คำนำหน้า (ไทย)</Label>
              <div className="flex gap-2 flex-wrap">
                {PREFIXES_TH.map(p => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => {
                      const next = form.prefix === p ? '' : p
                      setForm(f => ({
                        ...f,
                        prefix: next,
                        prefix_en: next ? (PREFIX_SYNC[next] ?? f.prefix_en) : f.prefix_en,
                      }))
                    }}
                    className={`px-3 py-1.5 text-sm rounded-lg border transition ${
                      form.prefix === p
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {p}
                  </button>
                ))}
                <input
                  type="text"
                  value={PREFIXES_TH.includes(form.prefix) ? '' : form.prefix}
                  onChange={e => set('prefix', e.target.value)}
                  placeholder="อื่นๆ"
                  className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg w-24 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div>
              <Label>คำนำหน้า (English)</Label>
              <div className="flex gap-2 flex-wrap">
                {PREFIXES_EN.map(p => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => set('prefix_en', form.prefix_en === p ? '' : p)}
                    className={`px-3 py-1.5 text-sm rounded-lg border transition ${
                      form.prefix_en === p
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <Field label="ชื่อ (ภาษาไทย)" value={form.first_name_th} onChange={v => set('first_name_th', v)} placeholder="ชื่อจริง" />
          <Field label="นามสกุล (ภาษาไทย)" value={form.last_name_th} onChange={v => set('last_name_th', v)} placeholder="นามสกุล" />
          <Field label="ชื่อ (ภาษาอังกฤษ)" value={form.first_name_en} onChange={v => set('first_name_en', v)} placeholder="First name" />
          <Field label="นามสกุล (ภาษาอังกฤษ)" value={form.last_name_en} onChange={v => set('last_name_en', v)} placeholder="Last name" />
          <Field label="ชื่อเล่น / Nickname" value={form.nickname} onChange={v => set('nickname', v)} placeholder="ชื่อเล่น" />
          <Field label="เบอร์โทรศัพท์" value={form.phone} onChange={v => set('phone', v)} placeholder="0x-xxxx-xxxx" type="tel" />
          <Field label="LINE ID" value={form.line_id} onChange={v => set('line_id', v)} placeholder="@lineid" />

          {/* Source */}
          <div>
            <Label>แหล่งที่มา</Label>
            <select
              value={form.source}
              onChange={e => set('source', e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">— เลือกแหล่งที่มา —</option>
              {SOURCE_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
            {form.source === 'other' && (
              <input
                type="text"
                value={form.source_other}
                onChange={e => set('source_other', e.target.value)}
                placeholder="ระบุแหล่งที่มา..."
                className="mt-2 w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            )}
          </div>

          {/* Lead Status */}
          <div>
            <Label>สถานะ Lead</Label>
            <div className="flex gap-2 flex-wrap">
              {LEAD_STATUS_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => set('lead_status', opt.value)}
                  className={`px-3 py-1.5 text-sm rounded-lg border transition ${
                    form.lead_status === opt.value
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Follow-up */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => set('follow_up', !form.follow_up)}
              className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${form.follow_up ? 'bg-blue-600' : 'bg-gray-200'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${form.follow_up ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
            <span className="text-sm text-gray-700">ต้องการติดตาม (Follow-up)</span>
          </div>
        </div>
      </Section>

      {/* บัตรประชาชน / พาสปอร์ต */}
      <Section title="บัตรประชาชน / พาสปอร์ต">
        <div className="space-y-4">
          <Field
            label="เลขบัตรประชาชน หรือเลขพาสปอร์ต"
            value={form.national_id}
            onChange={v => set('national_id', v.replace(/[^A-Za-z0-9]/g, '').slice(0, 20))}
            placeholder="x xxxx xxxxx xx x หรือ AA1234567"
            maxLength={20}
          />
          <DocumentUploader
            {...idCardState}
            label="รูปบัตรประชาชน / พาสปอร์ต"
            isPrivate
            enableWatermark
          />
        </div>
      </Section>

      {/* ที่อยู่ */}
      <Section title="ที่อยู่">
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="บ้านเลขที่" value={form.address_no} onChange={v => set('address_no', v)} placeholder="123/4" />
            <Field label="หมู่ที่" value={form.moo} onChange={v => set('moo', v)} placeholder="5" />
            <Field label="ถนน / ซอย" value={form.address_road} onChange={v => set('address_road', v)} placeholder="ถ.สุขุมวิท ซ.21" />
          </div>
          <AddressSelector
            province={form.province}
            district={form.district}
            subdistrict={form.subdistrict}
            zip={form.zip}
            onChange={(field, value) => set(field, value)}
          />
        </div>
      </Section>

      {/* ลายเซ็น */}
      <Section title="ลายเซ็น">
        {sigState.url ? (
          <DocumentUploader {...sigState} label="ลายเซ็น" />
        ) : (
          <div className="space-y-3">
            <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
              <button
                type="button"
                onClick={() => setSigMode('draw')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition ${sigMode === 'draw' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
              >
                <PenLine className="w-3.5 h-3.5" />
                วาดออนไลน์
              </button>
              <button
                type="button"
                onClick={() => setSigMode('upload')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition ${sigMode === 'upload' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
              >
                <Upload className="w-3.5 h-3.5" />
                อัปโหลดไฟล์
              </button>
            </div>
            {sigMode === 'draw' ? (
              <SignaturePad
                onSave={async (blob) => {
                  const file = new File([blob], `sig-${Date.now()}.png`, { type: 'image/png' })
                  setSigMode('upload')
                  await sigState.upload(file)
                }}
                onCancel={() => setSigMode('upload')}
              />
            ) : (
              <>
                <DocumentUploader {...sigState} label="รูปลายเซ็น" />
                <p className="text-xs text-gray-400">PNG พื้นหลังโปร่งใสแสดงผลดีที่สุดในสัญญา</p>
              </>
            )}
          </div>
        )}
      </Section>

      {/* หมายเหตุ */}
      <Section title="หมายเหตุ">
        <textarea
          value={form.notes}
          onChange={e => set('notes', e.target.value)}
          rows={3}
          placeholder="บันทึกเพิ่มเติม..."
          className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
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
          href={customerId ? `/customers/${customerId}` : '/customers'}
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
          {isPending ? 'กำลังบันทึก...' : customerId ? 'บันทึกการเปลี่ยนแปลง' : 'เพิ่มลูกค้า'}
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
}

function Field({ label, value, onChange, placeholder, type = 'text', maxLength }: FieldProps) {
  return (
    <div>
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
