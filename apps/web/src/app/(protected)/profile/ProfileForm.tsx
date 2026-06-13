'use client'

import { useState, useTransition, useEffect, useRef } from 'react'
import { Upload, Loader2, PenLine, ScanLine, BookOpen, Globe } from 'lucide-react'
import { updateProfile, updateSignatureUrl, updateIdCardUrl, parseDocument, parseBankBook, updatePublicProfile, updateAvatarUrl, updateBankBookUrl } from './actions'
import type { Profile } from '@/types'
import SignaturePad from '@/components/shared/SignaturePad'
import AddressSelector from '@/components/shared/AddressSelector'
import { useDocumentUpload } from '@/hooks/useUpload'
import DocumentUploader from '@/components/shared/DocumentUploader'
import { compressForOcr } from '@/lib/compressForOcr'
import { useAiQuota } from '@/hooks/useAiQuota'
import { AiQuotaBadge } from '@/components/shared/AiQuotaBadge'
import { AiLimitModal } from '@/components/shared/AiLimitModal'
import { createClient } from '@/lib/supabase/client'

// ─── Constants ───────────────────────────────────────────────

const PREFIX_SYNC: Record<string, string> = { นาย: 'Mr.', นาง: 'Mrs.', นางสาว: 'Miss' }
const PREFIXES_TH = ['นาย', 'นาง', 'นางสาว']
const PREFIXES_EN = ['Mr.', 'Mrs.', 'Miss']
const BANK_OPTIONS = [
  'ธนาคารกรุงเทพ', 'ธนาคารกสิกรไทย', 'ธนาคารไทยพาณิชย์',
  'ธนาคารกรุงไทย', 'ธนาคารกรุงศรีอยุธยา', 'ธนาคารทหารไทยธนชาต',
  'ธนาคารออมสิน', 'ธนาคารอาคารสงเคราะห์', 'ธนาคารเกียรตินาคินภัทร',
]

const ROLE_LABELS: Record<string, string> = {
  admin: 'แอดมิน', manager: 'ผู้จัดการ', user: 'เอเจนต์',
}
const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-600',
}
const STATUS_LABELS: Record<string, string> = {
  pending: 'รอการอนุมัติ', approved: 'อนุมัติแล้ว', rejected: 'ปฏิเสธแล้ว',
}

// ─── Form State ───────────────────────────────────────────────

interface FormState {
  prefix: string; prefix_en: string
  first_name_th: string; last_name_th: string
  first_name_en: string; last_name_en: string
  national_id: string; nationality: string; gender: string; birth_date: string
  name: string; nickname: string; phone: string; line_id: string
  position: string; company_name: string; tax_id: string
  address_no: string; moo: string; address_road: string
  province: string; district: string; subdistrict: string; zip: string
  bank_name: string; bank_account_no: string; bank_account_name: string
}

function profileToForm(p: Profile): FormState {
  return {
    prefix: p.prefix ?? '', prefix_en: p.prefix_en ?? '',
    first_name_th: p.first_name_th ?? '', last_name_th: p.last_name_th ?? '',
    first_name_en: p.first_name_en ?? '', last_name_en: p.last_name_en ?? '',
    national_id: p.national_id ?? '', nationality: p.nationality ?? '',
    gender: p.gender ?? '', birth_date: p.birth_date ?? '',
    name: p.name ?? '', nickname: p.nickname ?? '',
    phone: p.phone ?? '', line_id: p.line_id ?? '',
    position: p.position ?? '', company_name: p.company_name ?? '',
    tax_id: p.tax_id ?? '',
    address_no: p.address_no ?? '', moo: p.moo ?? '', address_road: p.address_road ?? '',
    province: p.province ?? '', district: p.district ?? '',
    subdistrict: p.subdistrict ?? '', zip: p.zip ?? '',
    bank_name: p.bank_name ?? '', bank_account_no: p.bank_account_no ?? '',
    bank_account_name: p.bank_account_name ?? '',
  }
}

// ─── Avatar compression ───────────────────────────────────────

function compressImageToWebP(file: File, maxPx: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new window.Image()
    img.onload = () => {
      const scale = Math.min(1, maxPx / Math.max(img.width, img.height))
      const w = Math.round(img.width * scale)
      const h = Math.round(img.height * scale)
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      canvas.getContext('2d')!.drawImage(img, 0, 0, w, h)
      canvas.toBlob(
        b => b ? resolve(b) : reject(new Error('canvas toBlob failed')),
        'image/webp', 0.85,
      )
    }
    img.onerror = reject
    img.src = URL.createObjectURL(file)
  })
}

// ─── Component ───────────────────────────────────────────────

export default function ProfileForm({ profile }: { profile: Profile }) {
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<FormState>(() => profileToForm(profile))
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
  const bankBookManualRef = useRef<HTMLInputElement>(null)

  // ── Public profile state ──
  // ── Bank book image state ──
  const [bankBookUrl, setBankBookUrl] = useState(profile.bank_book_url ?? '')
  const [bankBookUploading, setBankBookUploading] = useState(false)

  const [publicSlug, setPublicSlug] = useState(profile.public_slug ?? '')
  const [bio, setBio] = useState(profile.bio ?? '')
  const [showPhone, setShowPhone] = useState(profile.show_phone ?? false)
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url ?? '')
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [avatarError, setAvatarError] = useState('')
  const [publicSaving, setPublicSaving] = useState(false)
  const [publicError, setPublicError] = useState('')
  const [publicSuccess, setPublicSuccess] = useState(false)
  const avatarInputRef = useRef<HTMLInputElement>(null)

  const set = (k: keyof FormState, v: string) =>
    setForm(f => ({ ...f, [k]: v }))

  const idCardState = useDocumentUpload({
    category: 'id-cards',
    entityId: profile.id,
    isPrivate: true,
    enableWatermark: true,
    initialUrl: profile.id_card_url ?? '',
  })
  const sigState = useDocumentUpload({
    category: 'signatures',
    entityId: profile.id,
    initialUrl: profile.signature_url ?? '',
  })

  // Persist signature URL automatically on change
  const prevSigUrl = useRef(profile.signature_url ?? '')
  useEffect(() => {
    if (sigState.url !== prevSigUrl.current) {
      prevSigUrl.current = sigState.url
      updateSignatureUrl(sigState.url || null)
    }
  }, [sigState.url])

  // Persist id_card URL automatically on change
  const prevIdUrl = useRef(profile.id_card_url ?? '')
  useEffect(() => {
    if (idCardState.url !== prevIdUrl.current) {
      prevIdUrl.current = idCardState.url
      updateIdCardUrl(idCardState.url || null)
    }
  }, [idCardState.url])

  // Auto-fill tax_id from national_id when tax_id is empty
  useEffect(() => {
    if (form.national_id && !form.tax_id) {
      setForm(f => ({ ...f, tax_id: form.national_id }))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.national_id])

  // ─── OCR Document ─────────────────────────────────────────

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
      if (result.nationality) { set('nationality', result.nationality); fields.push('nationality') }
      if (result.gender) { set('gender', result.gender); fields.push('gender') }
      if (result.birth_date) { set('birth_date', result.birth_date); fields.push('birth_date') }
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
      setOcrMessage(`อ่าน${docLabel}สำเร็จ · กรอก ${fields.length} ช่อง`)
      if (!editing) setEditing(true)
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

      // Upload bank book image to storage and save URL
      try {
        setBankBookUploading(true)
        const blob = await compressImageToWebP(file, 1280)
        const supabase = createClient()
        const path = `bank-books/${profile.id}/${Date.now()}.webp`
        const { error: upErr } = await supabase.storage
          .from('documents')
          .upload(path, blob, { upsert: true, contentType: 'image/webp' })
        if (!upErr) {
          const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(path)
          const url = `${publicUrl}?v=${Date.now()}`
          setBankBookUrl(url)
          await updateBankBookUrl(url)
        }
      } catch { /* non-fatal — bank data still filled */ } finally {
        setBankBookUploading(false)
      }

      refreshQuota()
      setBankOcrMessage(fields.length
        ? `กรอกข้อมูลธนาคาร: ${fields.join(', ')}`
        : 'ไม่พบข้อมูลธนาคาร กรุณากรอกเอง')
      if (!editing) setEditing(true)
    })
  }

  // ─── Manual bank book upload (no OCR) ───────────────────
  async function handleBankBookManualUpload(file: File) {
    setBankBookUploading(true)
    setBankOcrMessage('')
    try {
      const blob = await compressImageToWebP(file, 1280)
      const supabase = createClient()
      const path = `bank-books/${profile.id}/${Date.now()}.webp`
      const { error: upErr } = await supabase.storage
        .from('documents')
        .upload(path, blob, { upsert: true, contentType: 'image/webp' })
      if (upErr) throw upErr
      const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(path)
      const url = `${publicUrl}?v=${Date.now()}`
      setBankBookUrl(url)
      await updateBankBookUrl(url)
      setBankOcrMessage('อัพโหลดสมุดบัญชีแล้ว ✓')
    } catch {
      setBankOcrMessage('อัพโหลดไม่สำเร็จ กรุณาลองใหม่')
    } finally {
      setBankBookUploading(false)
    }
  }

  // ─── Submit ──────────────────────────────────────────────

  function handleSubmit() {
    setError('')
    const formData = new FormData()
    Object.entries(form).forEach(([k, v]) => formData.set(k, v))
    startTransition(async () => {
      const result = await updateProfile(formData)
      if (result.error) { setError(result.error); return }
      setEditing(false)
    })
  }

  function handleCancel() {
    setForm(profileToForm(profile))
    setEditing(false)
    setError('')
  }

  // ── Avatar upload ────────────────────────────────────────────

  async function handleAvatarFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setAvatarError('')
    setAvatarUploading(true)
    try {
      const blob = await compressImageToWebP(file, 400)
      const supabase = createClient()
      const path = `${profile.id}/avatar.webp`
      const { error: upErr } = await supabase.storage
        .from('avatars')
        .upload(path, blob, { upsert: true, contentType: 'image/webp' })
      if (upErr) throw upErr
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
      const url = `${publicUrl}?v=${Date.now()}`
      const result = await updateAvatarUrl(url)
      if (result.error) { setAvatarError(result.error); return }
      setAvatarUrl(url)
    } catch {
      setAvatarError('อัพโหลดรูปไม่สำเร็จ')
    } finally {
      setAvatarUploading(false)
    }
  }

  // ── Public profile save ──────────────────────────────────────

  async function handleSavePublicProfile() {
    setPublicError('')
    setPublicSuccess(false)
    setPublicSaving(true)
    const result = await updatePublicProfile({
      public_slug: publicSlug.trim() || null,
      bio: bio.trim() || null,
      show_phone: showPhone,
    })
    setPublicSaving(false)
    if (result.error) setPublicError(result.error)
    else setPublicSuccess(true)
  }

  const createdDate = profile.created_at
    ? new Date(profile.created_at).toLocaleDateString('th-TH', {
        year: 'numeric', month: 'long', day: 'numeric',
      })
    : '—'

  // ─── Render ──────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Header: badges + action buttons */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_COLORS[profile.account_status]}`}>
            {STATUS_LABELS[profile.account_status]}
          </span>
          <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-blue-50 text-blue-700">
            {ROLE_LABELS[profile.role]}
          </span>
        </div>
        <div className="flex gap-2">
          {!editing ? (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition"
            >
              แก้ไข
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={handleCancel}
                disabled={isPending}
                className="px-4 py-2 border border-gray-200 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isPending}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm font-medium rounded-lg transition"
              >
                {isPending ? 'กำลังบันทึก...' : 'บันทึก'}
              </button>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {showLimitModal && quota && (
        <AiLimitModal quota={quota} onClose={() => setShowLimitModal(false)} />
      )}

      {/* OCR Section — visible in edit mode */}
      {editing && (
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
      )}

      {/* ตัวตน (Identity) */}
      <Section title="ตัวตน">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Prefix TH */}
          <div className="sm:col-span-2">
            <Label>คำนำหน้า (ภาษาไทย)</Label>
            {editing ? (
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
                      form.prefix === p ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                    }`}
                  >{p}</button>
                ))}
                <input
                  type="text"
                  value={PREFIXES_TH.includes(form.prefix) ? '' : form.prefix}
                  onChange={e => set('prefix', e.target.value)}
                  placeholder="อื่นๆ"
                  className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg w-24 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            ) : (
              <p className="text-sm text-gray-900">{form.prefix || '—'}</p>
            )}
          </div>

          <Field label="ชื่อ (ภาษาไทย)" value={form.first_name_th} onChange={v => set('first_name_th', v)} editing={editing} placeholder="ชื่อจริง" />
          <Field label="นามสกุล (ภาษาไทย)" value={form.last_name_th} onChange={v => set('last_name_th', v)} editing={editing} placeholder="นามสกุล" />

          {/* Prefix EN */}
          <div className="sm:col-span-2">
            <Label>คำนำหน้า (ภาษาอังกฤษ)</Label>
            {editing ? (
              <div className="flex gap-2 flex-wrap">
                {PREFIXES_EN.map(p => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => set('prefix_en', form.prefix_en === p ? '' : p)}
                    className={`px-3 py-1.5 text-sm rounded-lg border transition ${
                      form.prefix_en === p ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                    }`}
                  >{p}</button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-900">{form.prefix_en || '—'}</p>
            )}
          </div>

          <Field label="First name" value={form.first_name_en} onChange={v => set('first_name_en', v)} editing={editing} placeholder="First name" />
          <Field label="Last name" value={form.last_name_en} onChange={v => set('last_name_en', v)} editing={editing} placeholder="Last name" />

          {/* ID */}
          <div className="sm:col-span-2">
            <Label>เลขบัตรประชาชน หรือเลขพาสปอร์ต</Label>
            {editing ? (
              <input
                type="text"
                value={form.national_id}
                onChange={e => set('national_id', e.target.value.replace(/[^A-Za-z0-9]/g, '').slice(0, 20))}
                placeholder="x xxxx xxxxx xx x หรือ AA1234567"
                maxLength={20}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              />
            ) : (
              <p className="text-sm text-gray-900">{form.national_id || '—'}</p>
            )}
          </div>

          <Field label="สัญชาติ (Nationality)" value={form.nationality} onChange={v => set('nationality', v)} editing={editing} placeholder="THAI" />

          {/* Gender */}
          <div>
            <Label>เพศ</Label>
            {editing ? (
              <div className="flex gap-2">
                {[{ v: 'M', l: 'ชาย' }, { v: 'F', l: 'หญิง' }].map(({ v, l }) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => set('gender', form.gender === v ? '' : v)}
                    className={`px-4 py-2 text-sm rounded-lg border transition ${
                      form.gender === v ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                    }`}
                  >{l}</button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-900">
                {form.gender === 'M' ? 'ชาย' : form.gender === 'F' ? 'หญิง' : '—'}
              </p>
            )}
          </div>

          <Field label="วันเกิด" value={form.birth_date} onChange={v => set('birth_date', v)} editing={editing} placeholder="01 JAN 1990" />
        </div>

        {/* ID Card image */}
        <div className="mt-4">
          <Label>รูปบัตรประชาชน / พาสปอร์ต</Label>
          <DocumentUploader
            {...idCardState}
            label="รูปบัตรประชาชน / พาสปอร์ต"
            isPrivate
            enableWatermark
          />
        </div>
      </Section>

      {/* ข้อมูลส่วนตัว */}
      <Section title="ข้อมูลส่วนตัว">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <Field label="ชื่อแสดงผล" value={form.name} onChange={v => set('name', v)} editing={editing} placeholder="ชื่อ-นามสกุล" />
          </div>
          <Field label="ชื่อเล่น / Nickname" value={form.nickname} onChange={v => set('nickname', v)} editing={editing} placeholder="ชื่อเล่น" />
          <Field label="เบอร์โทรศัพท์" value={form.phone} onChange={v => set('phone', v)} editing={editing} placeholder="0x-xxxx-xxxx" type="tel" />
          <Field label="LINE ID" value={form.line_id} onChange={v => set('line_id', v)} editing={editing} placeholder="@lineid" />
          <Field label="ตำแหน่ง" value={form.position} onChange={v => set('position', v)} editing={editing} />
          <Field label="บริษัท / ทีม" value={form.company_name} onChange={v => set('company_name', v)} editing={editing} />
        </div>
      </Section>

      {/* ข้อมูลทางการ */}
      <Section title="ข้อมูลทางการ">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="เลขประจำตัวผู้เสียภาษี" value={form.tax_id} onChange={v => set('tax_id', v)} editing={editing} />
        </div>
      </Section>

      {/* ที่อยู่ */}
      <Section title="ที่อยู่">
        {editing ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field label="บ้านเลขที่" value={form.address_no} onChange={v => set('address_no', v)} editing={editing} placeholder="123/4" />
              <Field label="หมู่ที่" value={form.moo} onChange={v => set('moo', v)} editing={editing} placeholder="5" />
              <Field label="ถนน / ซอย" value={form.address_road} onChange={v => set('address_road', v)} editing={editing} placeholder="ถ.สุขุมวิท ซ.21" />
            </div>
            <AddressSelector
              province={form.province}
              district={form.district}
              subdistrict={form.subdistrict}
              zip={form.zip}
              onChange={(field, value) => set(field, value)}
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ReadOnly label="บ้านเลขที่" value={form.address_no} />
            {form.moo && <ReadOnly label="หมู่ที่" value={form.moo} />}
            <ReadOnly label="ถนน / ซอย" value={form.address_road} />
            <ReadOnly label="ตำบล / แขวง" value={form.subdistrict} />
            <ReadOnly label="อำเภอ / เขต" value={form.district} />
            <ReadOnly label="จังหวัด" value={form.province} />
            <ReadOnly label="รหัสไปรษณีย์" value={form.zip} />
          </div>
        )}
      </Section>

      {/* ธนาคาร */}
      <Section title="ข้อมูลธนาคาร">
        {editing && (
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 flex items-start gap-3 mb-4">
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
              {bankBookUploading && (
                <p className="text-xs text-blue-500 flex items-center gap-1 mt-1">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  กำลังบันทึกรูปสมุดบัญชี...
                </p>
              )}
            </div>
          </div>
        )}
        {/* Bank book image — always visible */}
        <div className="mb-4">
          <Label>รูปสมุดบัญชี</Label>
          <div className="flex items-start gap-3 flex-wrap">
            {bankBookUrl ? (
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={bankBookUrl} alt="สมุดบัญชี" className="h-20 rounded-xl border border-gray-200 object-cover" />
              </div>
            ) : (
              <div className="text-xs text-gray-400">ยังไม่มีรูปสมุดบัญชี</div>
            )}
            <div>
              <input
                ref={bankBookManualRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => {
                  const file = e.target.files?.[0]
                  if (file) handleBankBookManualUpload(file)
                  e.target.value = ''
                }}
              />
              <button
                type="button"
                onClick={() => bankBookManualRef.current?.click()}
                disabled={bankBookUploading}
                className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 text-gray-600 text-xs font-medium rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
              >
                <Upload className="w-3.5 h-3.5" />
                {bankBookUploading ? 'กำลังอัพโหลด...' : bankBookUrl ? 'เปลี่ยนรูป' : 'อัพโหลดสมุดบัญชี'}
              </button>
              <p className="text-xs text-gray-400 mt-1">JPG, PNG หรือ WebP</p>
              {bankOcrMessage && (
                <p className={`text-xs font-medium mt-1 ${bankOcrMessage.includes('✓') || bankOcrMessage.startsWith('กรอก') ? 'text-blue-700' : 'text-red-600'}`}>
                  {bankOcrMessage}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {editing ? (
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
          ) : (
            <ReadOnly label="ธนาคาร" value={form.bank_name} />
          )}
          <Field label="ชื่อบัญชี" value={form.bank_account_name} onChange={v => set('bank_account_name', v)} editing={editing} />
          <div className="sm:col-span-2">
            <Field label="เลขที่บัญชี" value={form.bank_account_no} onChange={v => set('bank_account_no', v)} editing={editing} placeholder="xxx-x-xxxxx-x" />
          </div>
        </div>
      </Section>

      {/* ลายเซ็น */}
      <Section title="ลายเซ็น (ใช้ในสัญญา PDF)">
        {sigState.url ? (
          <div className="space-y-2">
            <DocumentUploader {...sigState} label="ลายเซ็น" />
            <p className="text-xs text-gray-400">กดลบและอัปโหลดใหม่เพื่อเซ็นใหม่</p>
          </div>
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
            {(sigState.progress.phase === 'uploading' || sigState.progress.phase === 'processing') && (
              <p className="text-xs text-blue-600 flex items-center gap-1.5">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                กำลังบันทึกลายเซ็น...
              </p>
            )}
          </div>
        )}
      </Section>

      {/* ── โปรไฟล์สาธารณะ ── */}
      <Section title="โปรไฟล์สาธารณะ">
        <div className="space-y-5">
          {/* Avatar */}
          <div>
            <Label>รูปโปรไฟล์</Label>
            <div className="flex items-center gap-4">
              <div className="relative flex-shrink-0">
                {avatarUrl ? (
                  <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-blue-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-2xl">
                    {(profile.nickname ?? profile.first_name_th ?? profile.name ?? 'A').charAt(0).toUpperCase()}
                  </div>
                )}
                {avatarUploading && (
                  <div className="absolute inset-0 bg-white/70 rounded-full flex items-center justify-center">
                    <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                  </div>
                )}
              </div>
              <div>
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={avatarUploading}
                  className="flex items-center gap-1.5 text-sm px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
                >
                  <Upload className="w-3.5 h-3.5" />
                  เปลี่ยนรูปโปรไฟล์
                </button>
                <p className="text-xs text-gray-400 mt-1">JPG, PNG หรือ WebP · สูงสุด 2 MB</p>
                {avatarError && <p className="text-xs text-red-500 mt-1">{avatarError}</p>}
              </div>
            </div>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarFile}
            />
          </div>

          {/* URL Slug */}
          <div>
            <Label>ชื่อโปรไฟล์ (URL)</Label>
            <div className="flex items-center gap-0 border border-gray-200 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-blue-500">
              <span className="text-sm text-gray-400 bg-gray-50 px-3 py-2 border-r border-gray-200 shrink-0 select-none">
                proppsy.com/agent/
              </span>
              <input
                type="text"
                value={publicSlug}
                onChange={e => setPublicSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                placeholder="earth-property"
                maxLength={50}
                className="flex-1 px-3 py-2 text-sm outline-none bg-white"
              />
            </div>
            <p className="text-xs text-gray-400 mt-1">ตัวพิมพ์เล็ก a-z, ตัวเลข 0-9, ขีด (-) เท่านั้น · 3-50 ตัวอักษร</p>
          </div>

          {/* Bio */}
          <div>
            <Label>แนะนำตัว / Bio</Label>
            <textarea
              value={bio}
              onChange={e => setBio(e.target.value)}
              placeholder="แนะนำตัวสั้นๆ เช่น ประสบการณ์ ความเชี่ยวชาญ ย่านที่ดูแล..."
              maxLength={300}
              rows={3}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition resize-none"
            />
            <p className="text-xs text-gray-400 text-right -mt-1">{bio.length}/300</p>
          </div>

          {/* Show phone toggle */}
          <div className="flex items-center justify-between gap-4 py-1">
            <div>
              <p className="text-sm font-medium text-gray-700">แสดงเบอร์โทรในโปรไฟล์สาธารณะ</p>
              <p className="text-xs text-gray-400 mt-0.5">เบอร์โทรจะมองเห็นได้บนหน้าโปรไฟล์</p>
            </div>
            <button
              type="button"
              onClick={() => setShowPhone(v => !v)}
              className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${showPhone ? 'bg-blue-600' : 'bg-gray-200'}`}
              aria-label="toggle show phone"
            >
              <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${showPhone ? 'left-6' : 'left-1'}`} />
            </button>
          </div>

          {/* Profile link preview */}
          {publicSlug.length >= 3 && (
            <a
              href={`/agent/${publicSlug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:underline"
            >
              <Globe className="w-3.5 h-3.5" />
              ดูโปรไฟล์สาธารณะ →
            </a>
          )}

          {publicError && <p className="text-sm text-red-500">{publicError}</p>}
          {publicSuccess && !publicError && (
            <p className="text-sm text-green-600">บันทึกสำเร็จ</p>
          )}

          <button
            type="button"
            onClick={handleSavePublicProfile}
            disabled={publicSaving}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm font-medium rounded-lg transition"
          >
            {publicSaving ? 'กำลังบันทึก...' : 'บันทึกโปรไฟล์สาธารณะ'}
          </button>
        </div>
      </Section>

      {/* ข้อมูลบัญชี (read-only) */}
      <Section title="ข้อมูลบัญชี">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <ReadOnly label="อีเมล" value={profile.email} />
          <ReadOnly label="วันที่สมัคร" value={createdDate} />
        </div>
      </Section>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/70">
        <h2 className="text-sm font-semibold text-gray-700">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
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
  editing: boolean
  placeholder?: string
  type?: string
  maxLength?: number
}

function Field({ label, value, onChange, editing, placeholder, type = 'text', maxLength }: FieldProps) {
  return (
    <div>
      <Label>{label}</Label>
      {editing ? (
        <input
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          maxLength={maxLength}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
        />
      ) : (
        <p className="text-sm text-gray-900 min-h-[1.25rem]">{value || '—'}</p>
      )}
    </div>
  )
}

function ReadOnly({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <Label>{label}</Label>
      <p className="text-sm text-gray-900 min-h-[1.25rem]">{value || '—'}</p>
    </div>
  )
}
