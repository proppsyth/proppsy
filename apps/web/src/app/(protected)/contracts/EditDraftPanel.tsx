'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, X, Loader2, ChevronDown, ChevronUp } from 'lucide-react'
import { updateContractDraft } from './actions'

interface DraftData {
  contractId: string
  contractCategory: string | null
  docType: string
  // Core financial
  rentPrice: number | null
  depositMonths: number | null
  depositAmount: number | null
  contractMonths: number | null
  moveInDate: string | null
  endDate: string | null
  reservationExpireDate: string | null
  paymentDate: string | null
  penaltyAmount: number | null
  // Fees
  cleaningFee: number | null
  acCount: number | null
  acWashPerUnit: number | null
  occupantCount: number | null
  waterUnitPrice: number | null
  electricUnitPrice: number | null
  internetFee: number | null
  commonFee: number | null
  parkingFee: number | null
  // Payment terms
  paymentGraceDays: number | null
  paymentDayOfMonth: number | null
  // Flags
  vat7: boolean
  wht3: boolean
  // Commission
  commissionNet: number | null
  commissionRatePct: number | null
  commissionFromOwner: number | null
  commissionFromCustomer: number | null
}

interface Props {
  data: DraftData
}

function str(n: number | null): string { return n != null ? String(n) : '' }
function str2(s: string | null): string { return s ?? '' }

export default function EditDraftPanel({ data }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [showFees, setShowFees] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [isPending, startTransition] = useTransition()

  const isReservation = data.contractCategory === 'reservation'
  const isLease = data.contractCategory === 'lease'

  const [form, setForm] = useState(() => ({
    rentPrice:            str(data.rentPrice),
    depositMonths:        str(data.depositMonths),
    depositAmount:        str(data.depositAmount),
    contractMonths:       str(data.contractMonths),
    moveInDate:           str2(data.moveInDate),
    endDate:              str2(data.endDate),
    reservationExpireDate: str2(data.reservationExpireDate),
    paymentDate:          str2(data.paymentDate),
    penaltyAmount:        str(data.penaltyAmount),
    cleaningFee:          str(data.cleaningFee),
    acCount:              str(data.acCount),
    acWashPerUnit:        str(data.acWashPerUnit),
    occupantCount:        str(data.occupantCount),
    waterUnitPrice:       str(data.waterUnitPrice),
    electricUnitPrice:    str(data.electricUnitPrice),
    internetFee:          str(data.internetFee),
    commonFee:            str(data.commonFee),
    parkingFee:           str(data.parkingFee),
    paymentGraceDays:     str(data.paymentGraceDays),
    paymentDayOfMonth:    str(data.paymentDayOfMonth),
    vat7:                 data.vat7,
    wht3:                 data.wht3,
    commissionNet:        str(data.commissionNet),
    commissionRatePct:    str(data.commissionRatePct),
    commissionFromOwner:  str(data.commissionFromOwner),
    commissionFromCustomer: str(data.commissionFromCustomer),
  }))

  const set = (k: keyof typeof form, v: string | boolean) =>
    setForm(f => ({ ...f, [k]: v }))

  function handleRentChange(v: string) {
    const rent = parseFloat(v) || 0
    const months = parseFloat(form.depositMonths) || 1
    setForm(f => ({
      ...f,
      rentPrice: v,
      depositAmount: rent > 0 ? String(rent * months) : f.depositAmount,
    }))
  }

  function handleDepositMonthsChange(v: string) {
    const rent = parseFloat(form.rentPrice) || 0
    const months = parseFloat(v) || 1
    setForm(f => ({
      ...f,
      depositMonths: v,
      depositAmount: rent > 0 ? String(rent * months) : f.depositAmount,
    }))
  }

  function handleMoveInChange(v: string) {
    setForm(f => {
      const months = parseInt(f.contractMonths) || 12
      const next = { ...f, moveInDate: v }
      if (v) {
        const d = new Date(v)
        d.setMonth(d.getMonth() + months)
        next.endDate = d.toISOString().split('T')[0]!
        if (!f.paymentDayOfMonth) {
          next.paymentDayOfMonth = String(new Date(v).getDate())
        }
      }
      return next
    })
  }

  function handleContractMonthsChange(v: string) {
    setForm(f => {
      const months = parseInt(v) || 12
      const next = { ...f, contractMonths: v }
      if (f.moveInDate) {
        const d = new Date(f.moveInDate)
        d.setMonth(d.getMonth() + months)
        next.endDate = d.toISOString().split('T')[0]!
      }
      return next
    })
  }

  function handleSave() {
    setError('')
    setSaved(false)
    startTransition(async () => {
      const num = (v: string) => v.trim() ? parseFloat(v) || null : null
      const int = (v: string) => v.trim() ? parseInt(v) || null : null

      const result = await updateContractDraft(data.contractId, {
        rent_price:            num(form.rentPrice),
        deposit_months:        num(form.depositMonths),
        deposit_amount:        num(form.depositAmount),
        contract_months:       int(form.contractMonths),
        move_in_date:          form.moveInDate || null,
        end_date:              form.endDate || null,
        reservation_expire_date: form.reservationExpireDate || null,
        payment_date:          form.paymentDate || null,
        penalty_amount:        num(form.penaltyAmount),
        cleaning_fee:          num(form.cleaningFee),
        ac_count:              int(form.acCount),
        ac_wash_per_unit:      num(form.acWashPerUnit),
        occupant_count:        int(form.occupantCount),
        water_unit_price:      num(form.waterUnitPrice),
        electric_unit_price:   num(form.electricUnitPrice),
        internet_fee:          num(form.internetFee),
        common_fee:            num(form.commonFee),
        parking_fee:           num(form.parkingFee),
        payment_grace_days:    int(form.paymentGraceDays),
        payment_day_of_month:  int(form.paymentDayOfMonth),
        vat_7:                 form.vat7,
        wht_3:                 form.wht3,
        commission_net:        num(form.commissionNet),
        commission_rate_pct:   num(form.commissionRatePct),
        commission_from_owner: num(form.commissionFromOwner),
        commission_from_customer: num(form.commissionFromCustomer),
      })

      if (result.error) { setError(result.error); return }
      setSaved(true)
      router.refresh()
    })
  }

  if (!open) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50/70">
          <h2 className="text-sm font-semibold text-gray-700">แก้ไขข้อมูล (ร่าง)</h2>
        </div>
        <div className="p-4">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50 transition w-full justify-center"
          >
            <Pencil className="w-4 h-4" />
            แก้ไขข้อมูลสัญญา
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50/70 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-700">แก้ไขข้อมูล (ร่าง)</h2>
        <button type="button" onClick={() => { setOpen(false); setError(''); setSaved(false) }}
          className="text-gray-400 hover:text-gray-600">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4 space-y-3">
        {/* Core financial */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="ค่าเช่า / เดือน (บาท)" value={form.rentPrice} onChange={handleRentChange} type="number" />
          {!isReservation && (
            <>
              <Field label="เดือนมัดจำ" value={form.depositMonths} onChange={handleDepositMonthsChange} type="number" />
              <Field label="เงินมัดจำ (บาท)" value={form.depositAmount} onChange={v => set('depositAmount', v)} type="number" />
              <Field label="ระยะสัญญา (เดือน)" value={form.contractMonths} onChange={handleContractMonthsChange} type="number" />
              <Field label="วันเข้าอยู่" value={form.moveInDate} onChange={handleMoveInChange} type="date" />
              <Field label="วันสิ้นสุดสัญญา" value={form.endDate} onChange={v => set('endDate', v)} type="date" />
            </>
          )}
          {isReservation && (
            <>
              <Field label="เงินจอง (บาท)" value={form.depositAmount} onChange={v => set('depositAmount', v)} type="number" />
              <Field label="วันที่ทำสัญญาจอง" value={form.moveInDate} onChange={v => set('moveInDate', v)} type="date" />
              <Field label="วันหมดอายุการจอง" value={form.reservationExpireDate} onChange={v => set('reservationExpireDate', v)} type="date" />
              <Field label="วันที่ชำระ" value={form.paymentDate} onChange={v => set('paymentDate', v)} type="date" />
            </>
          )}
          <Field label="ค่าปรับ (บาท)" value={form.penaltyAmount} onChange={v => set('penaltyAmount', v)} type="number" />
        </div>

        {/* VAT/WHT */}
        <div className="flex flex-wrap gap-3 pt-1">
          <Toggle label="VAT 7%" checked={form.vat7} onChange={v => set('vat7', v)} />
          <Toggle label="หัก ณ ที่จ่าย 3%" checked={form.wht3} onChange={v => set('wht3', v)} />
        </div>

        {/* Collapsible fees */}
        {isLease && (
          <>
            <button
              type="button"
              onClick={() => setShowFees(v => !v)}
              className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 transition"
            >
              {showFees ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              {showFees ? 'ซ่อนรายละเอียดเพิ่มเติม' : 'แก้ไขค่าสาธารณูปโภค / ค่าใช้จ่ายเพิ่มเติม'}
            </button>

            {showFees && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-gray-100">
                <Field label="จำนวนผู้พักอาศัย" value={form.occupantCount} onChange={v => set('occupantCount', v)} type="number" />
                <Field label="ค่าน้ำ / หน่วย (บาท)" value={form.waterUnitPrice} onChange={v => set('waterUnitPrice', v)} type="number" />
                <Field label="ค่าไฟ / หน่วย (บาท)" value={form.electricUnitPrice} onChange={v => set('electricUnitPrice', v)} type="number" />
                <Field label="ค่าอินเตอร์เน็ต / เดือน (บาท)" value={form.internetFee} onChange={v => set('internetFee', v)} type="number" />
                <Field label="ค่าส่วนกลาง / เดือน (บาท)" value={form.commonFee} onChange={v => set('commonFee', v)} type="number" />
                <Field label="ค่าจอดรถ / เดือน (บาท)" value={form.parkingFee} onChange={v => set('parkingFee', v)} type="number" />
                <Field label="ค่าทำความสะอาด (บาท)" value={form.cleaningFee} onChange={v => set('cleaningFee', v)} type="number" />
                <Field label="จำนวนแอร์" value={form.acCount} onChange={v => set('acCount', v)} type="number" />
                <Field label="ค่าล้างแอร์ / เครื่อง (บาท)" value={form.acWashPerUnit} onChange={v => set('acWashPerUnit', v)} type="number" />
                <Field label="ชำระทุกวันที่ (1–31)" value={form.paymentDayOfMonth} onChange={v => set('paymentDayOfMonth', v)} type="number" />
                <Field label="ผ่อนผันชำระได้ไม่เกิน (วัน)" value={form.paymentGraceDays} onChange={v => set('paymentGraceDays', v)} type="number" />
                <Field label="ค่าคอมสุทธิ (บาท)" value={form.commissionNet} onChange={v => set('commissionNet', v)} type="number" />
              </div>
            )}
          </>
        )}

        {error && (
          <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
            {error}
          </div>
        )}
        {saved && (
          <div className="px-3 py-2 bg-green-50 border border-green-200 rounded-lg text-xs text-green-700">
            บันทึกแล้ว ✓
          </div>
        )}

        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={() => { setOpen(false); setError(''); setSaved(false) }}
            className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-600 text-sm rounded-xl hover:bg-gray-50 transition"
          >
            ปิด
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isPending}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition disabled:opacity-40"
          >
            {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            {isPending ? 'กำลังบันทึก...' : 'บันทึก'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Sub-components ──────────────────────────────────────────

function Field({ label, value, onChange, type = 'text' }: {
  label: string; value: string; onChange: (v: string) => void; type?: string
}) {
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-1 font-medium">{label}</label>
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

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs transition ${
        checked ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600'
      }`}
    >
      <div className={`relative flex-shrink-0 w-8 h-4 rounded-full transition-colors ${checked ? 'bg-blue-600' : 'bg-gray-200'}`}>
        <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-4' : 'translate-x-0.5'}`} />
      </div>
      {label}
    </button>
  )
}
