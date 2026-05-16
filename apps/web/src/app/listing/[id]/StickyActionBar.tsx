'use client'

import { useState, useTransition } from 'react'
import { Phone, MessageCircle, X, CheckCircle2, Loader2, ChevronUp, CalendarX } from 'lucide-react'
import { submitInquiry } from './actions'
import type { InquiryInput } from './actions'

// ─── Types ───────────────────────────────────────────────────

interface Agent {
  phone?: string
  line_id?: string
}

interface Props {
  agent: Agent | null
  stockId: string
  agentUid: string
  projectName?: string
  unitNo?: string
  rentPrice?: number
}

interface FormState {
  nickname: string
  phone: string
  line_id: string
  gender: string
  occupation: string
  occupation_other: string
  budget: string
  occupants: string
  duration: string
  move_in_date: string
}

const BLANK: FormState = {
  nickname: '',
  phone: '',
  line_id: '',
  gender: '',
  occupation: '',
  occupation_other: '',
  budget: '',
  occupants: '',
  duration: '',
  move_in_date: '',
}

// ─── Option lists ─────────────────────────────────────────────

const GENDER_OPTIONS = [
  { value: 'ชาย', label: 'ชาย' },
  { value: 'หญิง', label: 'หญิง' },
  { value: 'อื่น', label: 'อื่น' },
  { value: 'ไม่ระบุ', label: 'ไม่ระบุ' },
]

const OCCUPATION_OPTIONS = [
  { value: 'พนักงาน', label: 'พนักงาน' },
  { value: 'เจ้าของกิจการ', label: 'เจ้าของกิจการ' },
  { value: 'ฟรีแลนซ์', label: 'ฟรีแลนซ์' },
  { value: 'นักศึกษา', label: 'นักศึกษา' },
  { value: 'ชาวต่างชาติ', label: 'ชาวต่างชาติ' },
  { value: 'other', label: 'อื่นๆ' },
]

const BUDGET_OPTIONS = [
  { value: 'ไม่เกิน 10,000', label: 'ไม่เกิน 10k' },
  { value: '10k–20k', label: '10k–20k' },
  { value: '20k–30k', label: '20k–30k' },
  { value: '30k+', label: '30k+' },
]

const OCCUPANT_OPTIONS = [
  { value: '1 คน', label: '1 คน' },
  { value: '2 คน', label: '2 คน' },
  { value: '3 คน', label: '3 คน' },
  { value: '4+ คน', label: '4+ คน' },
]

const DURATION_OPTIONS = [
  { value: '6 เดือน', label: '6 เดือน' },
  { value: '1 ปี', label: '1 ปี' },
  { value: '2 ปี', label: '2 ปี' },
  { value: 'ยังไม่แน่ใจ', label: 'ยังไม่แน่ใจ' },
]

// ─── ChipGroup ────────────────────────────────────────────────

function ChipGroup({
  label,
  hint,
  options,
  value,
  onChange,
}: {
  label: string
  hint?: string
  options: { value: string; label: string }[]
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div>
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
        {label}
        {hint && <span className="ml-1 text-xs font-normal normal-case text-gray-400">{hint}</span>}
      </p>
      <div className="flex flex-wrap gap-2">
        {options.map(opt => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(value === opt.value ? '' : opt.value)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
              value === opt.value
                ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                : 'bg-white text-gray-700 border-gray-200 hover:border-blue-300 hover:bg-blue-50'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────

export default function StickyActionBar({ agent, stockId, agentUid, projectName, unitNo }: Props) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<FormState>(BLANK)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [isPending, startTransition] = useTransition()

  const set = (k: keyof FormState, v: string) => setForm(f => ({ ...f, [k]: v }))

  function close() {
    setOpen(false)
    setError('')
    if (done) {
      setForm(BLANK)
      setDone(false)
    }
  }

  function handleSubmit() {
    if (!form.nickname.trim()) { setError('กรุณาระบุชื่อที่ต้องการให้เรียก'); return }
    if (!form.phone.trim()) { setError('กรุณาระบุเบอร์โทรศัพท์'); return }

    setError('')
    startTransition(async () => {
      const resolvedOccupation =
        form.occupation === 'other'
          ? (form.occupation_other.trim() || 'อื่นๆ')
          : form.occupation || undefined

      const input: InquiryInput = {
        stock_id: stockId,
        agent_uid: agentUid,
        project_name: projectName,
        unit_no: unitNo,
        nickname: form.nickname,
        phone: form.phone,
        line_id: form.line_id || undefined,
        gender: form.gender || undefined,
        occupation: resolvedOccupation,
        budget: form.budget || undefined,
        occupants: form.occupants || undefined,
        duration: form.duration || undefined,
        move_in_date: form.move_in_date || undefined,
      }
      const result = await submitInquiry(input)
      if (result.error) {
        setError(result.error)
      } else {
        setDone(true)
      }
    })
  }

  return (
    <>
      {/* ── Sticky bottom action bar ─────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 shadow-lg px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center gap-2">
          <div className="flex gap-2">
            {agent?.phone && (
              <a
                href={`tel:${agent.phone}`}
                className="flex items-center justify-center w-11 h-11 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-100 transition flex-shrink-0"
                aria-label="โทร"
              >
                <Phone className="w-5 h-5" />
              </a>
            )}
            {agent?.line_id && (
              <a
                href={`https://line.me/ti/p/~${agent.line_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center w-11 h-11 rounded-xl bg-green-50 text-green-600 hover:bg-green-100 border border-green-100 transition flex-shrink-0"
                aria-label="LINE"
              >
                <MessageCircle className="w-5 h-5" />
              </a>
            )}
          </div>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex-1 flex items-center justify-center gap-2 h-11 rounded-xl font-bold text-sm text-white transition active:scale-95"
            style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)' }}
          >
            <ChevronUp className="w-4 h-4" />
            สนใจทรัพย์นี้
          </button>
        </div>
      </div>

      {/* ── Backdrop ─────────────────────────────────────── */}
      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm"
          onClick={close}
        />
      )}

      {/* ── Bottom sheet ─────────────────────────────────── */}
      <div
        className={`fixed left-0 right-0 bottom-0 z-50 bg-white rounded-t-3xl shadow-2xl transition-transform duration-300 ease-out flex flex-col max-h-[92dvh] ${
          open ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pb-3 pt-2 border-b border-gray-100 flex-shrink-0">
          <div>
            <h2 className="text-base font-bold text-gray-900">สนใจทรัพย์นี้</h2>
            {(projectName || unitNo) && (
              <p className="text-xs text-gray-500 mt-0.5">
                {[projectName, unitNo].filter(Boolean).join(' · ')}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={close}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* ── Success state ─────────────────────────────── */}
        {done ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6 py-12">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-bold text-gray-900 mb-1">ส่งคำขอสำเร็จ!</h3>
              <p className="text-sm text-gray-500">ตัวแทนจะติดต่อกลับโดยเร็ว<br />ขอบคุณที่สนใจทรัพย์สินนี้</p>
            </div>
            {agent?.phone && (
              <a
                href={`tel:${agent.phone}`}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold"
              >
                <Phone className="w-4 h-4" />
                โทรหาตัวแทนเลย
              </a>
            )}
          </div>
        ) : (
          <>
            {/* ── Form ──────────────────────────────────── */}
            <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4 space-y-5">

              {/* ── Contact ──────────────────────────────── */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    ชื่อที่ต้องการให้เรียก <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.nickname}
                    onChange={e => set('nickname', e.target.value)}
                    placeholder="เช่น มิ้นท์, นิค, สมชาย"
                    autoComplete="nickname"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    เบอร์โทรศัพท์ <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={e => set('phone', e.target.value)}
                    placeholder="08x-xxx-xxxx"
                    autoComplete="tel"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    LINE ID <span className="text-xs font-normal text-gray-400">(ถ้ามี)</span>
                  </label>
                  <input
                    type="text"
                    value={form.line_id}
                    onChange={e => set('line_id', e.target.value)}
                    placeholder="@lineid หรือ lineid"
                    autoComplete="off"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                </div>
              </div>

              <hr className="border-gray-100" />

              {/* ── Gender ───────────────────────────────── */}
              <ChipGroup
                label="เพศ"
                hint="(ถ้ามี)"
                options={GENDER_OPTIONS}
                value={form.gender}
                onChange={v => set('gender', v)}
              />

              {/* ── Occupation ───────────────────────────── */}
              <div>
                <ChipGroup
                  label="อาชีพ"
                  hint="(ถ้ามี)"
                  options={OCCUPATION_OPTIONS}
                  value={form.occupation}
                  onChange={v => { set('occupation', v); if (v !== 'other') set('occupation_other', '') }}
                />
                {form.occupation === 'other' && (
                  <input
                    type="text"
                    value={form.occupation_other}
                    onChange={e => set('occupation_other', e.target.value)}
                    placeholder="ระบุอาชีพ..."
                    autoFocus
                    className="mt-2 w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                )}
              </div>

              <hr className="border-gray-100" />

              {/* ── Budget ───────────────────────────────── */}
              <ChipGroup
                label="งบประมาณ / เดือน"
                options={BUDGET_OPTIONS}
                value={form.budget}
                onChange={v => set('budget', v)}
              />

              {/* ── Occupants ────────────────────────────── */}
              <ChipGroup
                label="จำนวนผู้พัก"
                options={OCCUPANT_OPTIONS}
                value={form.occupants}
                onChange={v => set('occupants', v)}
              />

              {/* ── Duration ─────────────────────────────── */}
              <ChipGroup
                label="ระยะเวลาเช่า"
                options={DURATION_OPTIONS}
                value={form.duration}
                onChange={v => set('duration', v)}
              />

              {/* ── Move-in date ─────────────────────────── */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  วันที่ต้องการย้ายเข้า
                  <span className="ml-1 text-xs font-normal normal-case text-gray-400">(ถ้ามี)</span>
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={form.move_in_date}
                    onChange={e => set('move_in_date', e.target.value)}
                    className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                  {form.move_in_date && (
                    <button
                      type="button"
                      onClick={() => set('move_in_date', '')}
                      className="flex items-center justify-center w-11 h-11 rounded-xl border border-gray-200 bg-white text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition flex-shrink-0"
                      aria-label="ล้างวันที่"
                    >
                      <CalendarX className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Error */}
              {error && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                  {error}
                </p>
              )}

              <p className="text-xs text-center text-gray-400 pb-2">
                ข้อมูลของคุณจะถูกส่งให้ตัวแทนเพื่อติดต่อกลับเท่านั้น
              </p>
            </div>

            {/* ── Submit ────────────────────────────────── */}
            <div className="px-5 pb-6 pt-3 border-t border-gray-100 flex-shrink-0">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isPending}
                className="w-full py-3.5 flex items-center justify-center gap-2 rounded-xl font-bold text-white text-base transition disabled:opacity-60 active:scale-95"
                style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)' }}
              >
                {isPending ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  '🔥 ส่งคำขอสนใจ'
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </>
  )
}
