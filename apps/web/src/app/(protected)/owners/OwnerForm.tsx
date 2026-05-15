'use client'

import { useState, useTransition, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ScanLine, Upload, Loader2, PenLine, BookOpen } from 'lucide-react'
import type { Owner } from '@/types'
import { createOwner, updateOwner, parseDocument, parseBankBook } from './actions'
import { compressForOcr } from '@/lib/compressForOcr'
import type { OwnerInput } from './actions'
import AddressSelector from '@/components/shared/AddressSelector'
import SignaturePad from '@/components/shared/SignaturePad'
import { useDocumentUpload } from '@/hooks/useUpload'
import DocumentUploader from '@/components/shared/DocumentUploader'
import { useAiQuota } from '@/hooks/useAiQuota'
import { AiQuotaBadge } from '@/components/shared/AiQuotaBadge'
import { AiLimitModal } from '@/components/shared/AiLimitModal'

// ─── Constants ───────────────────────────────────────────────

const PREFIXES_TH = ['นาย', 'นาง', 'นางสาว']
const PREFIXES_EN = ['Mr.', 'Mrs.', 'Miss', 'Ms.']
const BANK_OPTIONS = [
  'ธนาคารกรุงเทพ', 'ธนาคารกสิกรไทย', 'ธนาคารไทยพาณิชย์',
  'ธนาคารกรุงไทย', 'ธนาคารกรุงศรีอยุธยา', 'ธนาคารทหารไทยธนชาต',
  'ธนาคารออมสิน', 'ธนาคารอาคารสงเคราะห์', 'ธนาคารเกียรตินาคินภัทร',
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
  address_no: string
  address_road: string
  province: string
  district: string
  subdistrict: string
  zip: string
  bank_name: string
  bank_account_no: string
  bank_account_name: string
  notes: string
}

const DEFAULT: FormState = {
  prefix: '', prefix_en: '', first_name_th: '', last_name_th: '',
  first_name_en: '', last_name_en: '', nickname: '',
  phone: '', line_id: '', national_id: '',
  address_no: '', address_road: '',
  province: '', district: '', subdistrict: '', zip: '',
  bank_name: '', bank_account_no: '', bank_account_name: '',
  notes: '',
}

function ownerToForm(o: Owner): FormState {
  return {
    prefix: o.prefix ?? '',
    prefix_en: o.prefix_en ?? '',
    first_name_th: o.first_name_th ?? '',
    last_name_th: o.last_name_th ?? '',
    first_name_en: o.first_name_en ?? '',
    last_name_en: o.last_name_en ?? '',
    nickname: o.nickname ?? '',
    phone: o.phone ?? '',
    line_id: o.line_id ?? '',
    national_id: o.national_id ?? '',
    address_no: o.address_no ?? '',
    address_road: o.address_road ?? '',
    province: o.province ?? '',
    district: o.district ?? '',
    subdistrict: o.subdistrict ?? '',
    zip: o.zip ?? '',
    bank_name: o.bank_name ?? '',
    bank_account_no: o.bank_account_no ?? '',
    bank_account_name: o.bank_account_name ?? '',
    notes: o.notes ?? '',
  }
}

function toInput(f: FormState): OwnerInput {
  const str = (v: string) => v.trim() || undefined
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
    address_no: str(f.address_no),
    address_road: str(f.address_road),
    province: str(f.province),
    district: str(f.district),
    subdistrict: str(f.subdistrict),
    zip: str(f.zip),
    bank_name: str(f.bank_name),
    bank_account_no: str(f.bank_account_no),
    bank_account_name: str(f.bank_account_name),
    notes: str(f.notes),
  }
}

// ─── Component ───────────────────────────────────────────────

interface Props {
  initialData?: Owner
  ownerId?: string
}

export default function OwnerForm({ initialData, ownerId }: Props) {
  const router = useRouter()
  const [form, setForm] = useState<FormState>(
    initialData ? ownerToForm(initialData) : DEFAULT
  )
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()
  const [isOcrPending, startOcr] = useTransition()
  const [isBankOcrPending, startBankOcr] = useTransition()
  const [ocrMessage, setOcrMessage] = useState('')
  const [bankOcrMessage, setBankOcrMessage] = useState('')
  const [sigMode, setSigMode] = useState<'upload' | 'draw'>('upload')
  const [showLimitModal, setShowLimitModal] = useState(false)
  const { quota, refresh: refreshQuota, isExhausted } = useAiQuota()

  const ocrInputRef = useRef<HTMLInputElement>(null)
  const bankOcrInputRef = useRef<HTMLInputElement>(null)

  const idCardState = useDocumentUpload({
    category: 'id-cards',
    entityId: ownerId,
    isPrivate: true,
    enableWatermark: true,
    initialUrl: initialData?.id_card_url ?? '',
  })
  const sigState = useDocumentUpload({
    category: 'signatures',
    entityId: ownerId,
    initialUrl: initialData?.signature_url ?? '',
  })

  const set = (k: keyof FormState, v: string) =>
    setForm(f => ({ ...f, [k]: v }))

  // ─── OCR Document ─────────────────────────────────────────

  function handleOcr(file: File) {
    setOcrMessage('')
    startOcr(async () => {
      const { base64, mimeType } = await compressForOcr(file)
      const result = await parseDocument(base64, mimeType)
      if ('error' in result) { setOcrMessage(result.error); return }

      const fields: (keyof FormState)[] = []
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

  // ─── OCR Bank Book ────────────────────────────────────────

  function handleBankOcr(file: File) {
    setBankOcrMessage('')
    startBankOcr(async () => {
      const { base64, mimeType } = await compressForOcr(file)
      const result = await parseBankBook(base64, mimeType)
      if ('error' in result) { setBankOcrMessage(result.error); return }

      const fields: string[] = []
      if (result.bank_name) { set('bank_name', result.bank_name); fields.push('ธนาคาร') }
      if (result.bank_account_name) { set('bank_account_name', result.bank_account_name); fields.push('ชื่อบัญชี') }
      if (result.bank_account_no) { set('bank_account_no', result.bank_account_no); fields.push('เลขบัญชี') }

      refreshQuota()
      setBankOcrMessage(fields.length
        ? `กรอกข้อมูลธนาคาร: ${fields.join(', ')}`
        : 'ไม่พบข้อมูลธนาคาร กรุณากรอกเอง')
    })
  }

  // ─── Submit ──────────────────────────────────────────────

  function handleSubmit() {
    setError('')
    startTransition(async () => {
      const input: OwnerInput = {
        ...toInput(form),
        id_card_url: idCardState.url || undefined,
        signature_url: sigState.url || undefined,
      }
      if (ownerId) {
        const res = await updateOwner(ownerId, input)
        if (res.error) { setError(res.error); return }
        router.push(`/owners/${ownerId}`)
      } else {
        const res = await createOwner(input)
        if (res.error) { setError(res.error); return }
        router.push(`/owners/${res.id}`)
      }
    })
  }

  // ─── Render ──────────────────────────────────────────────

  return (
    <div className="space-y-5">
      {/* OCR Section */}
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
            {isOcrPending
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <ScanLine className="w-4 h-4" />}
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
                    onClick={() => set('prefix', form.prefix === p ? '' : p)}
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="บ้านเลขที่" value={form.address_no} onChange={v => set('address_no', v)} placeholder="123/4" />
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

      {/* ธนาคาร */}
      <Section title="บัญชีธนาคาร">
        <div className="space-y-4">
          {/* Bank book OCR */}
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 flex items-start gap-3">
            <BookOpen className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-blue-700 mb-2">สแกนสมุดบัญชีเพื่อกรอกข้อมูลธนาคารอัตโนมัติ</p>
              <input
                ref={bankOcrInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => {
                  const file = e.target.files?.[0]
                  if (file) handleBankOcr(file)
                  e.target.value = ''
                }}
              />
              <button
                type="button"
                onClick={() => {
                  if (isExhausted) { setShowLimitModal(true); return }
                  bankOcrInputRef.current?.click()
                }}
                disabled={isBankOcrPending}
                className={`flex items-center gap-2 px-3 py-1.5 text-white text-xs font-medium rounded-lg transition disabled:opacity-50 ${isExhausted ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
              >
                {isBankOcrPending
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : <ScanLine className="w-3.5 h-3.5" />}
                {isBankOcrPending ? 'กำลังอ่าน...' : 'สแกนสมุดบัญชี'}
              </button>
              {bankOcrMessage && (
                <p className={`text-xs font-medium mt-2 ${bankOcrMessage.startsWith('กรอก') ? 'text-blue-700' : 'text-red-600'}`}>
                  {bankOcrMessage}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>ธนาคาร</Label>
              <select
                value={form.bank_name}
                onChange={e => set('bank_name', e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">— เลือกธนาคาร —</option>
                {BANK_OPTIONS.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <Field label="ชื่อบัญชี" value={form.bank_account_name} onChange={v => set('bank_account_name', v)} placeholder="ชื่อเจ้าของบัญชี" />
            <div className="sm:col-span-2">
              <Field label="เลขที่บัญชี" value={form.bank_account_no} onChange={v => set('bank_account_no', v)} placeholder="xxx-x-xxxxx-x" />
            </div>
          </div>
        </div>
      </Section>

      {/* ลายเซ็น */}
      <Section title="ลายเซ็น">
        {sigState.url ? (
          <DocumentUploader {...sigState} label="ลายเซ็น" />
        ) : (
          <div className="space-y-3">
            {/* Mode toggle */}
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
          href={ownerId ? `/owners/${ownerId}` : '/owners'}
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
          {isPending ? 'กำลังบันทึก...' : ownerId ? 'บันทึกการเปลี่ยนแปลง' : 'เพิ่มเจ้าของทรัพย์'}
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
