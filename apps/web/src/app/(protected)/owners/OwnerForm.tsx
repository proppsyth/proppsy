'use client'

import { useState, useTransition, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { ScanLine, Upload, Loader2, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Owner } from '@/types'
import { createOwner, updateOwner, parseIdCard } from './actions'
import type { OwnerInput } from './actions'

// ─── Constants ───────────────────────────────────────────────

const PREFIXES_TH = ['นาย', 'นาง', 'นางสาว']
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
  id_card_url: string
  address_no: string
  address_road: string
  province: string
  district: string
  subdistrict: string
  zip: string
  bank_name: string
  bank_account_no: string
  bank_account_name: string
  signature_url: string
  notes: string
}

const DEFAULT: FormState = {
  prefix: '', prefix_en: '', first_name_th: '', last_name_th: '',
  first_name_en: '', last_name_en: '', nickname: '',
  phone: '', line_id: '', national_id: '',
  id_card_url: '', address_no: '', address_road: '',
  province: '', district: '', subdistrict: '', zip: '',
  bank_name: '', bank_account_no: '', bank_account_name: '',
  signature_url: '', notes: '',
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
    id_card_url: o.id_card_url ?? '',
    address_no: o.address_no ?? '',
    address_road: o.address_road ?? '',
    province: o.province ?? '',
    district: o.district ?? '',
    subdistrict: o.subdistrict ?? '',
    zip: o.zip ?? '',
    bank_name: o.bank_name ?? '',
    bank_account_no: o.bank_account_no ?? '',
    bank_account_name: o.bank_account_name ?? '',
    signature_url: o.signature_url ?? '',
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
    id_card_url: str(f.id_card_url),
    address_no: str(f.address_no),
    address_road: str(f.address_road),
    province: str(f.province),
    district: str(f.district),
    subdistrict: str(f.subdistrict),
    zip: str(f.zip),
    bank_name: str(f.bank_name),
    bank_account_no: str(f.bank_account_no),
    bank_account_name: str(f.bank_account_name),
    signature_url: str(f.signature_url),
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
  const [ocrMessage, setOcrMessage] = useState('')
  const [isUploadingIdCard, setIsUploadingIdCard] = useState(false)
  const [isUploadingSig, setIsUploadingSig] = useState(false)

  const ocrInputRef = useRef<HTMLInputElement>(null)
  const idCardRef = useRef<HTMLInputElement>(null)
  const sigRef = useRef<HTMLInputElement>(null)

  const set = (k: keyof FormState, v: string) =>
    setForm(f => ({ ...f, [k]: v }))

  // ─── OCR ─────────────────────────────────────────────────

  function handleOcr(file: File) {
    setOcrMessage('')
    const reader = new FileReader()
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string
      const [meta, base64] = dataUrl.split(',')
      const mimeType = meta?.match(/:(.*?);/)?.[1] ?? 'image/jpeg'
      if (!base64) return

      startOcr(async () => {
        const result = await parseIdCard(base64, mimeType)
        if ('error' in result) {
          setOcrMessage(result.error)
          return
        }
        const fields: (keyof FormState)[] = []
        const apply = (k: keyof FormState, v: string | null | undefined) => {
          if (v) { set(k, v); fields.push(k) }
        }
        apply('prefix', result.prefix)
        apply('first_name_th', result.first_name_th)
        apply('last_name_th', result.last_name_th)
        apply('national_id', result.national_id)
        apply('address_no', result.address_no)
        apply('address_road', result.address_road)
        apply('province', result.province)
        apply('district', result.district)
        apply('subdistrict', result.subdistrict)
        apply('zip', result.zip)
        setOcrMessage(`กรอกข้อมูลอัตโนมัติ ${fields.length} ช่อง`)
      })
    }
    reader.readAsDataURL(file)
  }

  // ─── Uploads ─────────────────────────────────────────────

  async function uploadToStorage(bucket: string, file: File): Promise<string | null> {
    const supabase = createClient()
    const path = `${Date.now()}-${file.name.replace(/\s/g, '_')}`
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, { upsert: true })
    if (error || !data) return null
    const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(data.path)
    return publicUrl
  }

  async function handleIdCardUpload(file: File) {
    setIsUploadingIdCard(true)
    const url = await uploadToStorage('id-cards', file)
    if (url) set('id_card_url', url)
    setIsUploadingIdCard(false)
  }

  async function handleSigUpload(file: File) {
    setIsUploadingSig(true)
    const url = await uploadToStorage('signatures', file)
    if (url) set('signature_url', url)
    setIsUploadingSig(false)
  }

  // ─── Submit ──────────────────────────────────────────────

  function handleSubmit() {
    setError('')
    startTransition(async () => {
      const input = toInput(form)
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
        <div className="px-4 py-3 bg-emerald-100/60 border-b border-emerald-200 flex items-center gap-2">
          <ScanLine className="w-4 h-4 text-emerald-700" />
          <span className="text-sm font-semibold text-emerald-800">OCR บัตรประชาชน</span>
        </div>
        <div className="p-4 space-y-3">
          <p className="text-xs text-emerald-700">ถ่ายภาพหรืออัปโหลดบัตรประชาชน ระบบจะกรอกข้อมูลให้อัตโนมัติ</p>
          <input
            ref={ocrInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={e => {
              const file = e.target.files?.[0]
              if (file) handleOcr(file)
              e.target.value = ''
            }}
          />
          <button
            type="button"
            onClick={() => ocrInputRef.current?.click()}
            disabled={isOcrPending}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition disabled:opacity-50"
          >
            {isOcrPending
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <ScanLine className="w-4 h-4" />}
            {isOcrPending ? 'กำลังอ่านข้อมูล...' : 'สแกนบัตรประชาชน'}
          </button>
          {ocrMessage && (
            <p className={`text-xs font-medium ${ocrMessage.startsWith('กรอก') ? 'text-emerald-700' : 'text-red-600'}`}>
              {ocrMessage}
            </p>
          )}
        </div>
      </div>

      {/* ข้อมูลส่วนตัว */}
      <Section title="ข้อมูลส่วนตัว">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Prefix */}
          <div className="sm:col-span-2">
            <Label>คำนำหน้า</Label>
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

          <Field label="ชื่อ (ภาษาไทย)" value={form.first_name_th} onChange={v => set('first_name_th', v)} placeholder="ชื่อจริง" />
          <Field label="นามสกุล (ภาษาไทย)" value={form.last_name_th} onChange={v => set('last_name_th', v)} placeholder="นามสกุล" />
          <Field label="ชื่อ (ภาษาอังกฤษ)" value={form.first_name_en} onChange={v => set('first_name_en', v)} placeholder="First name" />
          <Field label="นามสกุล (ภาษาอังกฤษ)" value={form.last_name_en} onChange={v => set('last_name_en', v)} placeholder="Last name" />
          <Field label="ชื่อเล่น / Nickname" value={form.nickname} onChange={v => set('nickname', v)} placeholder="ชื่อเล่น" />
          <Field label="เบอร์โทรศัพท์" value={form.phone} onChange={v => set('phone', v)} placeholder="0x-xxxx-xxxx" type="tel" />
          <Field label="LINE ID" value={form.line_id} onChange={v => set('line_id', v)} placeholder="@lineid" />
        </div>
      </Section>

      {/* บัตรประชาชน */}
      <Section title="บัตรประชาชน">
        <div className="space-y-4">
          <Field
            label="เลขบัตรประชาชน (13 หลัก)"
            value={form.national_id}
            onChange={v => set('national_id', v.replace(/\D/g, '').slice(0, 13))}
            placeholder="x xxxx xxxxx xx x"
            maxLength={13}
          />
          <div>
            <Label>รูปบัตรประชาชน</Label>
            {form.id_card_url ? (
              <div className="relative w-64 h-40 rounded-lg overflow-hidden border border-gray-200">
                <Image src={form.id_card_url} alt="บัตรประชาชน" fill className="object-cover" sizes="256px" />
                <button
                  type="button"
                  onClick={() => set('id_card_url', '')}
                  className="absolute top-1.5 right-1.5 w-6 h-6 bg-black/60 text-white rounded-full flex items-center justify-center hover:bg-black/80 transition"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <>
                <input
                  ref={idCardRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={e => {
                    const file = e.target.files?.[0]
                    if (file) handleIdCardUpload(file)
                    e.target.value = ''
                  }}
                />
                <button
                  type="button"
                  onClick={() => idCardRef.current?.click()}
                  disabled={isUploadingIdCard}
                  className="flex items-center gap-2 px-3 py-2 border border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-blue-400 hover:text-blue-600 transition disabled:opacity-50"
                >
                  {isUploadingIdCard ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  {isUploadingIdCard ? 'กำลังอัปโหลด...' : 'อัปโหลดรูปบัตร'}
                </button>
              </>
            )}
          </div>
        </div>
      </Section>

      {/* ที่อยู่ */}
      <Section title="ที่อยู่">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="บ้านเลขที่" value={form.address_no} onChange={v => set('address_no', v)} placeholder="123/4" />
          <Field label="ถนน / ซอย" value={form.address_road} onChange={v => set('address_road', v)} placeholder="ถ.สุขุมวิท ซ.21" />
          <Field label="แขวง / ตำบล" value={form.subdistrict} onChange={v => set('subdistrict', v)} placeholder="แขวง" />
          <Field label="เขต / อำเภอ" value={form.district} onChange={v => set('district', v)} placeholder="เขต" />
          <Field label="จังหวัด" value={form.province} onChange={v => set('province', v)} placeholder="กรุงเทพมหานคร" />
          <Field label="รหัสไปรษณีย์" value={form.zip} onChange={v => set('zip', v.replace(/\D/g, '').slice(0, 5))} placeholder="10110" maxLength={5} />
        </div>
      </Section>

      {/* ธนาคาร */}
      <Section title="บัญชีธนาคาร">
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
      </Section>

      {/* ลายเซ็น */}
      <Section title="ลายเซ็น">
        {form.signature_url ? (
          <div className="relative w-52 h-24 rounded-lg overflow-hidden border border-gray-200 bg-white">
            <Image src={form.signature_url} alt="ลายเซ็น" fill className="object-contain p-2" sizes="208px" />
            <button
              type="button"
              onClick={() => set('signature_url', '')}
              className="absolute top-1.5 right-1.5 w-6 h-6 bg-black/60 text-white rounded-full flex items-center justify-center hover:bg-black/80 transition"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <>
            <input
              ref={sigRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={e => {
                const file = e.target.files?.[0]
                if (file) handleSigUpload(file)
                e.target.value = ''
              }}
            />
            <button
              type="button"
              onClick={() => sigRef.current?.click()}
              disabled={isUploadingSig}
              className="flex items-center gap-2 px-3 py-2 border border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-blue-400 hover:text-blue-600 transition disabled:opacity-50"
            >
              {isUploadingSig ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {isUploadingSig ? 'กำลังอัปโหลด...' : 'อัปโหลดรูปลายเซ็น'}
            </button>
            <p className="text-xs text-gray-400 mt-1.5">รูปภาพพื้นหลังโปร่งใส (PNG) จะแสดงผลดีที่สุดในสัญญา</p>
          </>
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
