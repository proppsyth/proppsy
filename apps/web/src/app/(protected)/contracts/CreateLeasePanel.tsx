'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { GitBranch, ChevronDown, ChevronUp, Loader2, X } from 'lucide-react'
import { createLeaseFromReservation } from './actions'
import {
  TEMPLATE_REGISTRY, LANGUAGE_LABELS,
  type LanguageVersion,
} from '@/lib/contracts/templateRegistry'
import {
  type ReservationLease,
  buildLeaseFormDefaults,
  defaultPenaltyAmount,
  computeLeaseEndDate,
} from '@/lib/contracts/leaseFromReservation'

interface Props {
  reservation: ReservationLease
}

function fmt(n: number): string {
  return new Intl.NumberFormat('th-TH').format(n)
}


export default function CreateLeasePanel({ reservation }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [showExtra, setShowExtra] = useState(false)
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  const [form, setForm] = useState(() => ({
    ...buildLeaseFormDefaults(reservation),
    language: 'th' as LanguageVersion,
  }))

  const set = (k: keyof typeof form, v: string) => setForm(f => ({ ...f, [k]: v }))

  function handleRentChange(v: string) {
    const rent = parseFloat(v)
    const depositMonths = parseFloat(form.depositMonths) || 2
    setForm(f => ({
      ...f,
      rentPrice: v,
      // depositAmount = booking fee from reservation — not recomputed on rent change
      securityDeposit: rent > 0 ? String(rent * depositMonths) : f.securityDeposit,
      penaltyAmount:   rent > 0 ? String(defaultPenaltyAmount(rent)) : f.penaltyAmount,
    }))
  }

  function handleDepositMonthsChange(v: string) {
    const rent = parseFloat(form.rentPrice)
    const months = parseFloat(v) || 2
    setForm(f => ({
      ...f,
      depositMonths: v,
      securityDeposit: rent > 0 ? String(rent * months) : f.securityDeposit,
    }))
  }

  function handleMoveInChange(v: string) {
    setForm(f => {
      const next = { ...f, moveInDate: v }
      if (v && !f.paymentDayOfMonth) {
        next.paymentDayOfMonth = String(new Date(v).getDate())
      }
      return next
    })
  }

  const computedEndDate = form.moveInDate
    ? computeLeaseEndDate(form.moveInDate, parseInt(form.contractMonths) || 12)
    : null

  const availableTemplates = TEMPLATE_REGISTRY.filter(t => t.docType === 'rental')
  const availableLanguages = availableTemplates.map(t => t.language)
  const selectedTemplate = availableTemplates.find(t => t.language === form.language) ?? availableTemplates[0]

  function handleSubmit() {
    if (!form.moveInDate) { setError('กรุณาระบุวันเข้าอยู่'); return }
    setError('')
    startTransition(async () => {
      const num = (v: string) => v.trim() ? parseFloat(v) || null : null
      const int = (v: string) => v.trim() ? parseInt(v) || null : null

      const result = await createLeaseFromReservation(reservation.reservationId, {
        move_in_date:      form.moveInDate,
        contract_months:   int(form.contractMonths),
        rent_price:        num(form.rentPrice),
        deposit_months:    num(form.depositMonths),
        deposit_amount:    num(form.depositAmount),
        security_deposit:  num(form.securityDeposit),
        cleaning_fee:      num(form.cleaningFee),
        ac_count:          int(form.acCount),
        ac_wash_per_unit:  num(form.acWashPerUnit),
        occupant_count:    int(form.occupantCount),
        payment_grace_days: int(form.paymentGraceDays),
        payment_day_of_month: int(form.paymentDayOfMonth),
        penalty_amount:    num(form.penaltyAmount),
        water_unit_price:  num(form.waterUnitPrice),
        electric_unit_price: num(form.electricUnitPrice),
        internet_fee:      num(form.internetFee),
        common_fee:        num(form.commonFee),
        parking_fee:       num(form.parkingFee),
        language_version:  form.language,
        template_slug:     selectedTemplate?.slug ?? null,
      })

      if (result.error) { setError(result.error); return }
      router.push(`/contracts/${result.id}`)
    })
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50/70">
        <h2 className="text-sm font-semibold text-gray-700">ขั้นตอนถัดไป</h2>
      </div>
      <div className="p-4">
        {!open ? (
          <>
            <div className="flex items-start gap-2 mb-3 p-3 bg-amber-50 rounded-lg text-xs text-amber-700">
              <GitBranch className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              <span>เมื่อลูกค้าพร้อมทำสัญญาเช่า กดปุ่มด้านล่างเพื่อกรอกข้อมูลสัญญาเช่าและสร้างเอกสารทันที</span>
            </div>
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition w-full"
            >
              <GitBranch className="w-4 h-4" />
              สร้างสัญญาเช่าจากใบจองนี้
            </button>
          </>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold text-gray-800">กรอกข้อมูลสัญญาเช่า</p>
              <button type="button" onClick={() => { setOpen(false); setError('') }}
                className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Language / Template */}
            {availableLanguages.length > 1 && (
              <div className="mb-4">
                <p className="text-xs text-gray-500 mb-2 font-medium">ภาษาสัญญา</p>
                <div className="flex gap-2 flex-wrap">
                  {availableLanguages.map(lang => (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, language: lang }))}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition ${
                        form.language === lang
                          ? 'border-blue-600 bg-blue-50 text-blue-700'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      {LANGUAGE_LABELS[lang]}
                    </button>
                  ))}
                </div>
                {selectedTemplate && (
                  <p className="text-xs text-gray-400 mt-1">ไฟล์: {selectedTemplate.filename}</p>
                )}
              </div>
            )}

            {/* Core terms */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <Field label="วันเข้าอยู่ *" value={form.moveInDate} onChange={handleMoveInChange} type="date" />
              <Field label="ระยะสัญญา (เดือน)" value={form.contractMonths} onChange={v => set('contractMonths', v)} type="number" />
              <Field label="ค่าเช่า / เดือน (บาท)"
                value={form.rentPrice} onChange={handleRentChange} type="number"
                hint={reservation.rentPrice ? `จากใบจอง: ฿${fmt(reservation.rentPrice)}` : undefined}
              />
              <Field label="เดือนเงินประกัน" value={form.depositMonths} onChange={handleDepositMonthsChange} type="number" />
              <Field label="เงินมัดจำ/จอง (บาท)" hint="เงินจองที่เก็บตอนจอง"
                value={form.depositAmount} onChange={v => set('depositAmount', v)} type="number" />
              <Field label="เงินประกัน (บาท)" hint="ค่าประกัน 2 เดือนค่าเช่า (ค่าเริ่มต้น)"
                value={form.securityDeposit} onChange={v => set('securityDeposit', v)} type="number" />
              <div>
                <label className="block text-xs text-gray-500 mb-1 font-medium">วันสิ้นสุด (คำนวณอัตโนมัติ)</label>
                <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-600">
                  {computedEndDate
                    ? new Date(computedEndDate).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })
                    : '—'}
                </div>
              </div>
            </div>

            {/* Extra fields toggle */}
            <button
              type="button"
              onClick={() => setShowExtra(v => !v)}
              className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 mb-3 transition"
            >
              {showExtra ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              {showExtra ? 'ซ่อนรายละเอียดเพิ่มเติม' : 'กรอกรายละเอียดเพิ่มเติม (ค่าสาธารณูปโภค, ค่าปรับ, ฯลฯ)'}
            </button>

            {showExtra && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4 pt-3 border-t border-gray-100">
                <Field label="จำนวนผู้พักอาศัย" value={form.occupantCount} onChange={v => set('occupantCount', v)} type="number" />
                <Field label="ค่าทำความสะอาด (บาท)" value={form.cleaningFee} onChange={v => set('cleaningFee', v)} type="number" />
                <Field label="จำนวนแอร์" value={form.acCount} onChange={v => set('acCount', v)} type="number" />
                <Field label="ค่าล้างแอร์ / เครื่อง (บาท)" value={form.acWashPerUnit} onChange={v => set('acWashPerUnit', v)} type="number" />
                <Field label="ค่าปรับผิดนัด (บาท)" value={form.penaltyAmount} onChange={v => set('penaltyAmount', v)} type="number" />
                <Field label="ผ่อนผันชำระได้ไม่เกิน (วัน)" value={form.paymentGraceDays} onChange={v => set('paymentGraceDays', v)} type="number" />
                <Field label="ชำระทุกวันที่ (1–31)" value={form.paymentDayOfMonth} onChange={v => set('paymentDayOfMonth', v)} type="number" />
              </div>
            )}

            {error && (
              <div className="mb-3 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                {error}
              </div>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setOpen(false); setError('') }}
                className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-600 text-sm rounded-xl hover:bg-gray-50 transition"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isPending}
                className="flex-2 flex items-center justify-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition disabled:opacity-40"
              >
                {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                {isPending ? 'กำลังสร้าง...' : 'สร้างสัญญาเช่า'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function Field({ label, value, onChange, type = 'text', hint }: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  hint?: string
}) {
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-1 font-medium">{label}</label>
      {hint && <p className="text-xs text-gray-400 mb-1">{hint}</p>}
      <div className="relative flex items-center">
        <input
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 pr-8"
        />
        {type === 'date' && value && (
          <button type="button" onClick={() => onChange('')}
            className="absolute right-2.5 text-gray-400 hover:text-gray-600">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  )
}
