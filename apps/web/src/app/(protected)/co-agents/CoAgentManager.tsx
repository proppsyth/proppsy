'use client'

import { useState, useTransition, useRef } from 'react'
import { Plus, X, Pencil, Trash2, ScanLine, Loader2, BookOpen, PenLine, Upload } from 'lucide-react'
import { createCoAgent, updateCoAgent, deleteCoAgent, parseCoAgentIdCard, parseCoAgentBankBook, type CoAgentInput } from './actions'
import { compressForOcr } from '@/lib/compressForOcr'
import AddressSelector from '@/components/shared/AddressSelector'
import SignaturePad from '@/components/shared/SignaturePad'
import DocumentUploader from '@/components/shared/DocumentUploader'
import { useDocumentUpload } from '@/hooks/useUpload'
import { useAiQuota } from '@/hooks/useAiQuota'
import { AiQuotaBadge } from '@/components/shared/AiQuotaBadge'
import { AiLimitModal } from '@/components/shared/AiLimitModal'

// ─── Constants ───────────────────────────────────────────────

const PREFIXES_TH = ['นาย', 'นาง', 'นางสาว']
const PREFIXES_EN = ['Mr.', 'Mrs.', 'Ms.']
const PREFIX_SYNC: Record<string, string> = { นาย: 'Mr.', นาง: 'Mrs.', นางสาว: 'Ms.' }
const BANK_OPTIONS = [
  'ธนาคารกรุงเทพ', 'ธนาคารกสิกรไทย', 'ธนาคารไทยพาณิชย์',
  'ธนาคารกรุงไทย', 'ธนาคารกรุงศรีอยุธยา', 'ธนาคารทหารไทยธนชาต',
  'ธนาคารออมสิน', 'ธนาคารอาคารสงเคราะห์', 'ธนาคารเกียรตินาคินภัทร',
]

// ─── Types ───────────────────────────────────────────────────

export interface CoAgent {
  id: string
  prefix_th: string | null
  prefix_en: string | null
  first_name_th: string
  last_name_th: string
  first_name_en: string | null
  last_name_en: string | null
  address_no: string | null
  moo: string | null
  soi: string | null
  road: string | null
  subdistrict: string | null
  district: string | null
  province: string | null
  zip: string | null
  bank_name: string | null
  bank_account_name: string | null
  bank_account_no: string | null
  national_id: string | null
  tax_id: string | null
  id_card_url: string | null
  bank_book_url: string | null
  signature_url: string | null
}

interface FormState {
  prefix_th: string
  prefix_en: string
  first_name_th: string
  last_name_th: string
  first_name_en: string
  last_name_en: string
  address_no: string
  moo: string
  soi: string
  road: string
  subdistrict: string
  district: string
  province: string
  zip: string
  bank_name: string
  bank_account_name: string
  bank_account_no: string
  national_id: string
  tax_id: string
}

const EMPTY: FormState = {
  prefix_th: '', prefix_en: '',
  first_name_th: '', last_name_th: '',
  first_name_en: '', last_name_en: '',
  address_no: '', moo: '', soi: '', road: '',
  subdistrict: '', district: '', province: '', zip: '',
  bank_name: '', bank_account_name: '', bank_account_no: '',
  national_id: '', tax_id: '',
}

function fullNameTh(p: CoAgent): string {
  return [p.prefix_th, p.first_name_th, p.last_name_th].filter(Boolean).join(' ')
}

function agentToForm(p: CoAgent): FormState {
  return {
    prefix_th: p.prefix_th ?? '',
    prefix_en: p.prefix_en ?? '',
    first_name_th: p.first_name_th,
    last_name_th: p.last_name_th,
    first_name_en: p.first_name_en ?? '',
    last_name_en: p.last_name_en ?? '',
    address_no: p.address_no ?? '',
    moo: p.moo ?? '',
    soi: p.soi ?? '',
    road: p.road ?? '',
    subdistrict: p.subdistrict ?? '',
    district: p.district ?? '',
    province: p.province ?? '',
    zip: p.zip ?? '',
    bank_name: p.bank_name ?? '',
    bank_account_name: p.bank_account_name ?? '',
    bank_account_no: p.bank_account_no ?? '',
    national_id: p.national_id ?? '',
    tax_id: p.tax_id ?? '',
  }
}

// ─── Inner form component (has its own upload state) ─────────

export function CoAgentForm({
  editingAgent,
  onSaved,
  onCancel,
}: {
  editingAgent: CoAgent | null
  onSaved: (agent: CoAgent) => void
  onCancel: () => void
}) {
  const agentId = editingAgent?.id
  const [form, setForm] = useState<FormState>(editingAgent ? agentToForm(editingAgent) : EMPTY)
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()
  const [isOcrPending, startOcr] = useTransition()
  const [isBankOcrPending, startBankOcr] = useTransition()
  const [ocrMessage, setOcrMessage] = useState('')
  const [bankOcrMessage, setBankOcrMessage] = useState('')
  const [sigMode, setSigMode] = useState<'upload' | 'draw'>('upload')
  const [showLimitModal, setShowLimitModal] = useState(false)
  const [bankNameIsAuto, setBankNameIsAuto] = useState(!editingAgent?.bank_account_name)
  const { quota, refresh: refreshQuota, isExhausted } = useAiQuota()

  const ocrInputRef = useRef<HTMLInputElement>(null)
  const bankOcrInputRef = useRef<HTMLInputElement>(null)

  const idCardState = useDocumentUpload({
    category: 'id-cards',
    entityId: agentId,
    isPrivate: true,
    enableWatermark: true,
    initialUrl: editingAgent?.id_card_url ?? '',
  })
  const sigState = useDocumentUpload({
    category: 'signatures',
    entityId: agentId,
    initialUrl: editingAgent?.signature_url ?? '',
  })
  const bankBookState = useDocumentUpload({
    category: 'bank-books',
    entityId: agentId,
    isPrivate: true,
    watermarkStyle: 'bank-book',
    initialUrl: editingAgent?.bank_book_url ?? '',
  })

  const set = (k: keyof FormState, v: string) =>
    setForm(f => {
      const next: FormState = { ...f, [k]: v }
      if (bankNameIsAuto && (k === 'first_name_th' || k === 'last_name_th')) {
        const fn = k === 'first_name_th' ? v : f.first_name_th
        const ln = k === 'last_name_th' ? v : f.last_name_th
        next.bank_account_name = [fn, ln].filter(Boolean).join(' ')
      }
      return next
    })

  // ─── OCR ID Card ──────────────────────────────────────────

  function handleOcr(file: File) {
    setOcrMessage('')
    startOcr(async () => {
      const { base64, mimeType } = await compressForOcr(file)
      const result = await parseCoAgentIdCard(base64, mimeType)
      if ('error' in result) { setOcrMessage(result.error); return }

      const updates: Partial<FormState> = {}
      const fields: string[] = []
      const apply = (k: keyof FormState, v: string | null | undefined) => {
        if (v) { (updates as Record<string, string>)[k] = v; fields.push(k) }
      }

      const isPassport = result.doc_type === 'passport'
      apply('prefix_th', result.prefix)
      apply('first_name_th', result.first_name_th)
      apply('last_name_th', result.last_name_th)
      apply('first_name_en', result.first_name_en)
      apply('last_name_en', result.last_name_en)
      apply('national_id', result.national_id)

      if (!isPassport) {
        apply('address_no', result.address_no)
        apply('moo', result.moo)
        apply('road', result.address_road)
        apply('province', result.province)
        apply('district', result.district)
        apply('subdistrict', result.subdistrict)
        apply('zip', result.zip)
      }

      if (updates.prefix_th) {
        const eng = PREFIX_SYNC[updates.prefix_th]
        if (eng) updates.prefix_en = eng
      }

      if (bankNameIsAuto) {
        const fn = updates.first_name_th ?? ''
        const ln = updates.last_name_th ?? ''
        const fullName = [fn, ln].filter(Boolean).join(' ')
        if (fullName) updates.bank_account_name = fullName
      }

      setForm(f => ({ ...f, ...updates }))
      await idCardState.upload(file)
      refreshQuota()

      const docLabel = isPassport ? 'พาสปอร์ต' : 'บัตรประชาชน'
      setOcrMessage(`อ่าน${docLabel}สำเร็จ · กรอก ${fields.length} ช่อง`)
    })
  }

  // ─── OCR Bank Book ────────────────────────────────────────

  function handleBankOcr(file: File) {
    setBankOcrMessage('')
    startBankOcr(async () => {
      const { base64, mimeType } = await compressForOcr(file)
      const result = await parseCoAgentBankBook(base64, mimeType)
      if ('error' in result) { setBankOcrMessage(result.error); return }

      const updates: Partial<FormState> = {}
      const fields: string[] = []

      if (result.bank_name) { updates.bank_name = result.bank_name; fields.push('ธนาคาร') }
      if (result.bank_account_name) {
        updates.bank_account_name = result.bank_account_name
        fields.push('ชื่อบัญชี')
        setBankNameIsAuto(false)
      }
      if (result.bank_account_no) { updates.bank_account_no = result.bank_account_no; fields.push('เลขบัญชี') }

      if (Object.keys(updates).length > 0) setForm(f => ({ ...f, ...updates }))
      await bankBookState.upload(file)
      refreshQuota()

      setBankOcrMessage(fields.length
        ? `กรอกข้อมูลธนาคาร: ${fields.join(', ')}`
        : 'ไม่พบข้อมูลธนาคาร กรุณากรอกเอง')
    })
  }

  // ─── Submit ──────────────────────────────────────────────

  function handleSave() {
    if (!form.first_name_th.trim() || !form.last_name_th.trim()) {
      setError('กรุณากรอกชื่อและนามสกุล')
      return
    }
    setError('')
    startTransition(async () => {
      const t = (v: string) => v.trim() || undefined
      const input: CoAgentInput = {
        first_name_th: form.first_name_th.trim(),
        last_name_th: form.last_name_th.trim(),
        prefix_th: t(form.prefix_th),
        prefix_en: t(form.prefix_en),
        first_name_en: t(form.first_name_en),
        last_name_en: t(form.last_name_en),
        address_no: t(form.address_no),
        moo: t(form.moo),
        soi: t(form.soi),
        road: t(form.road),
        subdistrict: t(form.subdistrict),
        district: t(form.district),
        province: t(form.province),
        zip: t(form.zip),
        bank_name: t(form.bank_name),
        bank_account_name: t(form.bank_account_name),
        bank_account_no: t(form.bank_account_no),
        national_id: t(form.national_id),
        tax_id: t(form.tax_id),
        id_card_url: idCardState.url || undefined,
        bank_book_url: bankBookState.url || undefined,
        signature_url: sigState.url || undefined,
      }

      let result: { error?: string; id?: string }
      if (agentId) {
        result = await updateCoAgent(agentId, input)
      } else {
        result = await createCoAgent(input)
      }

      if (result.error) { setError(result.error); return }

      const saved: CoAgent = {
        id: agentId ?? result.id!,
        prefix_th: input.prefix_th ?? null,
        prefix_en: input.prefix_en ?? null,
        first_name_th: input.first_name_th,
        last_name_th: input.last_name_th,
        first_name_en: input.first_name_en ?? null,
        last_name_en: input.last_name_en ?? null,
        address_no: input.address_no ?? null,
        moo: input.moo ?? null,
        soi: input.soi ?? null,
        road: input.road ?? null,
        subdistrict: input.subdistrict ?? null,
        district: input.district ?? null,
        province: input.province ?? null,
        zip: input.zip ?? null,
        bank_name: input.bank_name ?? null,
        bank_account_name: input.bank_account_name ?? null,
        bank_account_no: input.bank_account_no ?? null,
        national_id: input.national_id ?? null,
        tax_id: input.tax_id ?? null,
        id_card_url: input.id_card_url ?? null,
        bank_book_url: input.bank_book_url ?? null,
        signature_url: input.signature_url ?? null,
      }
      onSaved(saved)
    })
  }

  return (
    <div className="space-y-5">
      {showLimitModal && quota && (
        <AiLimitModal quota={quota} onClose={() => setShowLimitModal(false)} />
      )}

      {/* ── OCR Section ── */}
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
          <input ref={ocrInputRef} type="file" accept="image/*" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleOcr(f); e.target.value = '' }} />
          <button
            type="button"
            onClick={() => { if (isExhausted) { setShowLimitModal(true); return } ocrInputRef.current?.click() }}
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

      {/* ── ชื่อ ── */}
      <Section title="ชื่อ">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2 space-y-2">
            <div>
              <Label>คำนำหน้า (ไทย)</Label>
              <div className="flex gap-2 flex-wrap">
                {PREFIXES_TH.map(p => (
                  <button key={p} type="button"
                    onClick={() => {
                      const next = form.prefix_th === p ? '' : p
                      setForm(f => ({ ...f, prefix_th: next, prefix_en: next ? (PREFIX_SYNC[next] ?? f.prefix_en) : f.prefix_en }))
                    }}
                    className={`px-3 py-1.5 text-sm rounded-lg border transition ${form.prefix_th === p ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 text-gray-700 hover:bg-gray-50'}`}
                  >{p}</button>
                ))}
                <input
                  type="text"
                  value={PREFIXES_TH.includes(form.prefix_th) ? '' : form.prefix_th}
                  onChange={e => set('prefix_th', e.target.value)}
                  placeholder="อื่นๆ"
                  className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg w-24 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div>
              <Label>คำนำหน้า (English)</Label>
              <div className="flex gap-2 flex-wrap">
                {PREFIXES_EN.map(p => (
                  <button key={p} type="button"
                    onClick={() => set('prefix_en', form.prefix_en === p ? '' : p)}
                    className={`px-3 py-1.5 text-sm rounded-lg border transition ${form.prefix_en === p ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 text-gray-700 hover:bg-gray-50'}`}
                  >{p}</button>
                ))}
              </div>
            </div>
          </div>

          <Field label="ชื่อ (ภาษาไทย) *" value={form.first_name_th} onChange={v => set('first_name_th', v)} placeholder="ชื่อจริง" />
          <Field label="นามสกุล (ภาษาไทย) *" value={form.last_name_th} onChange={v => set('last_name_th', v)} placeholder="นามสกุล" />
          <Field label="First Name (EN)" value={form.first_name_en} onChange={v => set('first_name_en', v)} placeholder="First name" />
          <Field label="Last Name (EN)" value={form.last_name_en} onChange={v => set('last_name_en', v)} placeholder="Last name" />
        </div>
      </Section>

      {/* ── บัตรประชาชน ── */}
      <Section title="บัตรประชาชน / พาสปอร์ต">
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="เลขบัตรประชาชน / พาสปอร์ต" value={form.national_id}
              onChange={v => set('national_id', v.replace(/[^A-Za-z0-9]/g, '').slice(0, 20))}
              placeholder="x xxxx xxxxx xx x" />
            <Field label="เลขผู้เสียภาษี" value={form.tax_id}
              onChange={v => set('tax_id', v)} placeholder="ถ้าต่างจากบัตร" />
          </div>
          <DocumentUploader {...idCardState} label="รูปบัตรประชาชน / พาสปอร์ต" isPrivate enableWatermark />
        </div>
      </Section>

      {/* ── ที่อยู่ ── */}
      <Section title="ที่อยู่">
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Field label="บ้านเลขที่" value={form.address_no} onChange={v => set('address_no', v)} placeholder="123/4" />
            <Field label="หมู่ที่" value={form.moo} onChange={v => set('moo', v)} placeholder="5" />
            <Field label="ซอย" value={form.soi} onChange={v => set('soi', v)} placeholder="ซ.21" />
            <Field label="ถนน" value={form.road} onChange={v => set('road', v)} placeholder="ถ.สุขุมวิท" />
          </div>
          <AddressSelector
            province={form.province}
            district={form.district}
            subdistrict={form.subdistrict}
            zip={form.zip}
            onChange={(field, value) => set(field as keyof FormState, value)}
          />
        </div>
      </Section>

      {/* ── ธนาคาร ── */}
      <Section title="บัญชีธนาคาร">
        <div className="space-y-4">
          {/* Bank OCR */}
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 flex items-start gap-3">
            <BookOpen className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-blue-700 mb-2">สแกนสมุดบัญชีเพื่อกรอกข้อมูลธนาคารอัตโนมัติ และบันทึกภาพ</p>
              <input ref={bankOcrInputRef} type="file" accept="image/*" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleBankOcr(f); e.target.value = '' }} />
              <button
                type="button"
                onClick={() => { if (isExhausted) { setShowLimitModal(true); return } bankOcrInputRef.current?.click() }}
                disabled={isBankOcrPending}
                className={`flex items-center gap-2 px-3 py-1.5 text-white text-xs font-medium rounded-lg transition disabled:opacity-50 ${isExhausted ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
              >
                {isBankOcrPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ScanLine className="w-3.5 h-3.5" />}
                {isBankOcrPending ? 'กำลังอ่าน...' : 'สแกนสมุดบัญชี'}
              </button>
              {bankOcrMessage && (
                <p className={`text-xs font-medium mt-2 ${bankOcrMessage.startsWith('กรอก') ? 'text-blue-700' : 'text-red-600'}`}>
                  {bankOcrMessage}
                </p>
              )}
            </div>
          </div>

          <DocumentUploader {...bankBookState} label="รูปสมุดบัญชี" isPrivate />

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
            <Field
              label="ชื่อบัญชี"
              value={form.bank_account_name}
              onChange={v => { setBankNameIsAuto(false); set('bank_account_name', v) }}
              placeholder="ชื่อเจ้าของบัญชี"
            />
            <div className="sm:col-span-2">
              <Field label="เลขที่บัญชี" value={form.bank_account_no} onChange={v => set('bank_account_no', v)} placeholder="xxx-x-xxxxx-x" />
            </div>
          </div>
        </div>
      </Section>

      {/* ── ลายเซ็น ── */}
      <Section title="ลายเซ็น">
        {sigState.url ? (
          <DocumentUploader {...sigState} label="ลายเซ็น" />
        ) : (
          <div className="space-y-3">
            <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
              <button type="button" onClick={() => setSigMode('draw')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition ${sigMode === 'draw' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>
                <PenLine className="w-3.5 h-3.5" />วาดออนไลน์
              </button>
              <button type="button" onClick={() => setSigMode('upload')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition ${sigMode === 'upload' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>
                <Upload className="w-3.5 h-3.5" />อัปโหลดไฟล์
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

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="flex gap-3 pb-4">
        <button type="button" onClick={onCancel}
          className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-600 text-sm rounded-xl hover:bg-gray-50 transition">
          ยกเลิก
        </button>
        <button type="button" onClick={handleSave} disabled={isPending}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition disabled:opacity-40">
          {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
          {isPending ? 'กำลังบันทึก...' : agentId ? 'บันทึกการเปลี่ยนแปลง' : 'เพิ่ม Co-Agent'}
        </button>
      </div>
    </div>
  )
}

// ─── Main manager (list + open/close form) ────────────────────

export default function CoAgentManager({ initialCoAgents }: { initialCoAgents: CoAgent[] }) {
  const [coAgents, setCoAgents] = useState<CoAgent[]>(initialCoAgents)
  const [showForm, setShowForm] = useState(false)
  const [editingAgent, setEditingAgent] = useState<CoAgent | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function openCreate() { setEditingAgent(null); setShowForm(true) }
  function openEdit(p: CoAgent) { setEditingAgent(p); setShowForm(true) }
  function closeForm() { setShowForm(false); setEditingAgent(null) }

  function handleSaved(saved: CoAgent) {
    if (editingAgent) {
      setCoAgents(prev => prev.map(p => p.id === saved.id ? saved : p))
    } else {
      setCoAgents(prev => [saved, ...prev])
    }
    closeForm()
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      const result = await deleteCoAgent(id)
      if (!result.error) {
        setCoAgents(prev => prev.filter(p => p.id !== id))
        setConfirmId(null)
      }
    })
  }

  if (showForm) {
    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-semibold text-gray-800">
            {editingAgent ? 'แก้ไข Co-Agent' : 'เพิ่ม Co-Agent ใหม่'}
          </p>
          <button type="button" onClick={closeForm} className="text-gray-400 hover:text-gray-600">
            <X className="w-4 h-4" />
          </button>
        </div>
        <CoAgentForm
          editingAgent={editingAgent}
          onSaved={handleSaved}
          onCancel={closeForm}
        />
      </div>
    )
  }

  return (
    <div>
      {coAgents.length === 0 ? (
        <div className="text-center py-10 text-gray-400 text-sm">
          ยังไม่มี Co-Agent — กดปุ่มด้านล่างเพื่อเพิ่ม
        </div>
      ) : (
        <div className="space-y-2 mb-4">
          {coAgents.map(p => (
            <div key={p.id} className="flex items-center justify-between px-4 py-3 bg-white rounded-xl border border-gray-100 shadow-sm">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate">{fullNameTh(p)}</p>
                {(p.first_name_en || p.last_name_en) && (
                  <p className="text-xs text-gray-400">{[p.prefix_en, p.first_name_en, p.last_name_en].filter(Boolean).join(' ')}</p>
                )}
                {p.bank_name && (
                  <p className="text-xs text-gray-400 mt-0.5">{p.bank_name} · {p.bank_account_no}</p>
                )}
                {p.national_id && <p className="text-xs text-gray-400">{p.national_id}</p>}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                <button type="button" onClick={() => openEdit(p)}
                  className="p-1.5 text-gray-400 hover:text-blue-600 transition">
                  <Pencil className="w-4 h-4" />
                </button>
                {confirmId === p.id ? (
                  <>
                    <button type="button" onClick={() => handleDelete(p.id)} disabled={isPending}
                      className="text-xs text-red-600 px-2 py-1 hover:bg-red-50 rounded">ยืนยัน</button>
                    <button type="button" onClick={() => setConfirmId(null)}
                      className="text-xs text-gray-400 px-2 py-1 hover:bg-gray-50 rounded">ยกเลิก</button>
                  </>
                ) : (
                  <button type="button" onClick={() => setConfirmId(p.id)}
                    className="p-1.5 text-gray-400 hover:text-red-600 transition">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      <button type="button" onClick={openCreate}
        className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition">
        <Plus className="w-4 h-4" />
        เพิ่ม Co-Agent
      </button>
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

function Field({ label, value, onChange, placeholder, maxLength }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; maxLength?: number
}) {
  return (
    <div>
      <Label>{label}</Label>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
      />
    </div>
  )
}
