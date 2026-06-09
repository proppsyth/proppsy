'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, ChevronLeft, Loader2, X, AlertCircle, Sparkles, User } from 'lucide-react'
import { DOC_TYPE_LABELS } from '@/types'
import type { ContractDocType } from '@/types'
import { createChildDocument } from './actions'
import { calculateCommission, calculateCommissionSplit, commissionHint } from '@/lib/contracts/commissionRules'
import { computeLeaseEndDate } from '@/lib/contracts/leaseFromReservation'

// ─── Types ───────────────────────────────────────────────────

interface LeaseSummary {
  rentPrice: number | null
  depositAmount: number | null
  depositMonths: number | null
  /** Security deposit (rent × deposit_months) */
  securityDeposit?: number | null
  /** Booking fee collected at reservation time */
  bookingAmount?: number | null
  contractMonths: number | null
  moveInDate: string | null
  endDate: string | null
  commissionNet: number | null
  commissionFromOwner: number | null
  commissionFromCustomer: number | null
  commissionRatePct: number | null
  coAgentSplitPct: number | null
  coAgentCommission: number | null
  vat7: boolean
  wht3: boolean
  paymentDayOfMonth: number | null
  paymentGraceDays: number | null
}

export interface CoAgentProfile {
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
}

interface Props {
  /** ID of the parent contract (lease or reservation) */
  leaseId: string
  leaseData: LeaseSummary
  /** 'lease' = full doc set; 'reservation' = only invoice/receipt reservation */
  parentCategory?: 'lease' | 'reservation'
  /** Pre-fetched co-agent profiles belonging to this agent */
  coAgents?: CoAgentProfile[]
}

interface FormValues {
  amount: string
  paymentDate: string
  paymentMethod: string
  bankRef: string
  periodDate: string
  commissionNet: string
  coAgentSplitPct: string
  coAgentCommission: string
  vat7: boolean
  wht3: boolean
  newRentPrice: string
  newContractMonths: string
  newMoveInDate: string
  newEndDate: string
  effectiveEndDate: string
  penaltyAmount: string
  issueDate: string
  // Co-agent profile
  selectedCoAgentId: string
  coAgentName: string
  coAgentNationalId: string
  coAgentTaxId: string
  coAgentAddressNo: string
  coAgentMoo: string
  coAgentSoi: string
  coAgentRoad: string
  coAgentSubdistrict: string
  coAgentDistrict: string
  coAgentProvince: string
  coAgentBankName: string
  coAgentAccountName: string
  coAgentAccountNo: string
  coAgentPaymentDirection: string
  noticeDetails: string
}

// ─── Doc type groups ──────────────────────────────────────────

const LEASE_DOC_GROUPS: Array<{
  label: string
  color: string
  types: Array<{ type: ContractDocType; label: string }>
}> = [
  {
    label: 'ใบแจ้งหนี้ / ใบเสร็จ',
    color: 'text-blue-700 border-blue-200 bg-blue-50 hover:bg-blue-100',
    types: [
      { type: 'invoice_deposit',     label: 'ใบแจ้งหนี้เงินประกัน' },
      { type: 'receipt_deposit',     label: 'ใบเสร็จเงินประกัน' },
      { type: 'receipt_rent',        label: 'ใบเสร็จค่าเช่า' },
      { type: 'receipt_book',        label: 'ใบเสร็จ (สมุด)' },
    ],
  },
  {
    label: 'คอมมิชชัน',
    color: 'text-violet-700 border-violet-200 bg-violet-50 hover:bg-violet-100',
    types: [
      { type: 'commission',         label: 'ใบคอมมิชชัน' },
      { type: 'commission_confirm', label: 'ยืนยันค่านายหน้า' },
    ],
  },
  {
    label: 'Co-Agent',
    color: 'text-indigo-700 border-indigo-200 bg-indigo-50 hover:bg-indigo-100',
    types: [
      { type: 'co_agent', label: 'สัญญา Co-Agent' },
    ],
  },
  {
    label: 'สัญญาต่อ',
    color: 'text-purple-700 border-purple-200 bg-purple-50 hover:bg-purple-100',
    types: [
      { type: 'renewal', label: 'ต่อสัญญา' },
    ],
  },
  {
    label: 'เอกสารประกอบ',
    color: 'text-teal-700 border-teal-200 bg-teal-50 hover:bg-teal-100',
    types: [
      { type: 'installment_schedule', label: 'ตารางผ่อนชำระ' },
      { type: 'furniture_list',       label: 'รายการเฟอร์นิเจอร์' },
    ],
  },
  {
    label: 'แจ้งเตือน / หนังสือ',
    color: 'text-amber-700 border-amber-200 bg-amber-50 hover:bg-amber-100',
    types: [
      { type: 'notice',  label: 'หนังสือแจ้ง' },
      { type: 'warning', label: 'หนังสือเตือน' },
    ],
  },
  {
    label: 'สิ้นสุดสัญญา',
    color: 'text-rose-700 border-rose-200 bg-rose-50 hover:bg-rose-100',
    types: [
      { type: 'termination',  label: 'หนังสือบอกเลิก' },
      { type: 'cancellation', label: 'หนังสือยกเลิก' },
      { type: 'end_contract', label: 'สิ้นสุดสัญญา' },
    ],
  },
]

const RESERVATION_DOC_GROUPS: typeof LEASE_DOC_GROUPS = [
  {
    label: 'ใบแจ้งหนี้ / ใบเสร็จ (เงินจอง)',
    color: 'text-blue-700 border-blue-200 bg-blue-50 hover:bg-blue-100',
    types: [
      { type: 'invoice_reservation', label: 'ใบแจ้งหนี้เงินจอง' },
      { type: 'receipt_reservation', label: 'ใบเสร็จเงินจอง' },
    ],
  },
]

function fmt(n: number): string {
  return new Intl.NumberFormat('th-TH').format(n)
}

function todayStr(): string {
  return new Date().toISOString().split('T')[0]!
}

// ─── Component ───────────────────────────────────────────────

export default function CreateChildDocPanel({ leaseId, leaseData, parentCategory = 'lease', coAgents = [] }: Props) {
  const router = useRouter()
  const [selectedType, setSelectedType] = useState<ContractDocType | null>(null)
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  const DOC_GROUPS = parentCategory === 'reservation' ? RESERVATION_DOC_GROUPS : LEASE_DOC_GROUPS

  function makeInitForm(type?: ContractDocType | null): FormValues {
    const today = todayStr()
    const isCoAgentDoc = type === 'co_agent'
    const isRenewal    = type === 'renewal'

    // Autofill commission from lease data
    const commissionNet = leaseData.commissionNet
      ?? (leaseData.rentPrice && leaseData.contractMonths
        ? calculateCommission(leaseData.contractMonths, leaseData.rentPrice).commission_amount
        : null)

    const splitPct = leaseData.coAgentSplitPct ?? (isCoAgentDoc ? 50 : null)
    const coAgentCommission = leaseData.coAgentCommission
      ?? (commissionNet && splitPct ? calculateCommissionSplit(commissionNet, splitPct).co_agent_amount : null)

    // Invoice/receipt amount: deposit docs = security deposit; reservation docs = booking fee
    const isDepositDoc     = type === 'invoice_deposit' || type === 'receipt_deposit'
    const isReservationDoc = type === 'invoice_reservation' || type === 'receipt_reservation'
    let defaultAmount: string
    if (isDepositDoc) {
      const security = leaseData.securityDeposit
        ?? ((leaseData.rentPrice ?? 0) * (leaseData.depositMonths ?? 2))
      defaultAmount = security > 0 ? String(security) : String(leaseData.depositAmount ?? '')
    } else if (isReservationDoc) {
      defaultAmount = String(leaseData.bookingAmount ?? leaseData.depositAmount ?? '')
    } else {
      defaultAmount = String(leaseData.depositAmount ?? '')
    }

    // Renewal: pre-fill new start from lease end date, compute new end date
    const renewalMoveIn  = isRenewal ? (leaseData.endDate ?? '') : ''
    const renewalEndDate = isRenewal && leaseData.endDate
      ? computeLeaseEndDate(leaseData.endDate, leaseData.contractMonths ?? 12)
      : ''

    return {
      amount:             defaultAmount,
      paymentDate:        today,
      paymentMethod:      'transfer',
      bankRef:            '',
      periodDate:         today,
      commissionNet:      String(commissionNet ?? ''),
      coAgentSplitPct:    String(splitPct ?? (isCoAgentDoc ? '50' : '')),
      coAgentCommission:  String(coAgentCommission ?? ''),
      vat7:               leaseData.vat7,
      wht3:               leaseData.wht3,
      newRentPrice:       String(leaseData.rentPrice ?? ''),
      newContractMonths:  String(leaseData.contractMonths ?? '12'),
      newMoveInDate:      renewalMoveIn,
      newEndDate:         renewalEndDate,
      effectiveEndDate:   '',
      penaltyAmount:      '',
      issueDate:          today,
      selectedCoAgentId:  '',
      coAgentName:        '',
      coAgentNationalId:  '',
      coAgentTaxId:       '',
      coAgentAddressNo:   '',
      coAgentMoo:         '',
      coAgentSoi:         '',
      coAgentRoad:        '',
      coAgentSubdistrict: '',
      coAgentDistrict:    '',
      coAgentProvince:    '',
      coAgentBankName:    '',
      coAgentAccountName: '',
      coAgentAccountNo:   '',
      coAgentPaymentDirection: 'agent_to_co_agent',
      noticeDetails:      '',
      ...(type === 'receipt_rent' ? { amount: String(leaseData.rentPrice ?? '') } : {}),
    }
  }

  const [form, setForm] = useState<FormValues>(() => makeInitForm())

  function handleSelectType(type: ContractDocType) {
    setSelectedType(type)
    setError('')
    setForm(makeInitForm(type))
  }

  const set = (k: keyof FormValues, v: string | boolean) =>
    setForm(f => ({ ...f, [k]: v }))

  // When commission amount changes, recalculate co-agent's share
  function handleCommissionChange(v: string) {
    const total = parseFloat(v) || 0
    const pct = parseInt(form.coAgentSplitPct) || 0
    const coAmt = pct > 0 && total > 0 ? calculateCommissionSplit(total, pct).co_agent_amount : 0
    setForm(f => ({
      ...f,
      commissionNet: v,
      coAgentCommission: coAmt > 0 ? String(coAmt) : f.coAgentCommission,
    }))
  }

  // When split % changes, recalculate co-agent's share
  function handleSplitPctChange(v: string) {
    const pct = parseInt(v) || 0
    const total = parseFloat(form.commissionNet) || 0
    const coAmt = pct > 0 && total > 0 ? calculateCommissionSplit(total, pct).co_agent_amount : 0
    setForm(f => ({
      ...f,
      coAgentSplitPct: v,
      coAgentCommission: coAmt > 0 ? String(coAmt) : f.coAgentCommission,
    }))
  }

  // Renewal: when start date changes, recompute end date
  function handleRenewalMoveInChange(v: string) {
    const months = parseInt(form.newContractMonths) || leaseData.contractMonths || 12
    setForm(f => ({
      ...f,
      newMoveInDate: v,
      newEndDate: v ? computeLeaseEndDate(v, months) : '',
    }))
  }

  // Renewal: when contract months changes, recompute end date
  function handleRenewalContractMonthsChange(v: string) {
    const months = parseInt(v) || leaseData.contractMonths || 12
    setForm(f => ({
      ...f,
      newContractMonths: v,
      newEndDate: f.newMoveInDate ? computeLeaseEndDate(f.newMoveInDate, months) : f.newEndDate,
    }))
  }

  // Co-agent: when a saved profile is selected, auto-fill all fields
  function handleSelectCoAgent(profileId: string) {
    const profile = coAgents.find(p => p.id === profileId)
    if (!profile) {
      setForm(f => ({ ...f, selectedCoAgentId: profileId }))
      return
    }
    const fullNameTh = [profile.prefix_th, profile.first_name_th, profile.last_name_th].filter(Boolean).join(' ')
    setForm(f => ({
      ...f,
      selectedCoAgentId:  profileId,
      coAgentName:        fullNameTh,
      coAgentNationalId:  profile.national_id ?? '',
      coAgentTaxId:       profile.tax_id ?? '',
      coAgentAddressNo:   profile.address_no ?? '',
      coAgentMoo:         profile.moo ?? '',
      coAgentSoi:         profile.soi ?? '',
      coAgentRoad:        profile.road ?? '',
      coAgentSubdistrict: profile.subdistrict ?? '',
      coAgentDistrict:    profile.district ?? '',
      coAgentProvince:    profile.province ?? '',
      coAgentBankName:    profile.bank_name ?? '',
      coAgentAccountName: profile.bank_account_name ?? '',
      coAgentAccountNo:   profile.bank_account_no ?? '',
    }))
  }

  function handleSubmit() {
    if (!selectedType) return
    setError('')
    startTransition(async () => {
      const num = (v: string) => v.trim() ? parseFloat(v) || null : null
      const int = (v: string) => v.trim() ? parseInt(v) || null : null

      const extraVars: Record<string, string> = {}
      if ((selectedType === 'notice' || selectedType === 'warning') && form.noticeDetails) {
        extraVars['เหตุผล'] = form.noticeDetails
        extraVars['รายละเอียด'] = form.noticeDetails
      }

      // Co-agent profile snapshot — structured fields for variableCompute
      const coAgentInfo: Record<string, string> | null = selectedType === 'co_agent' ? {
        ชื่อ:        form.coAgentName,
        เลขบัตร:     form.coAgentNationalId,
        เลขเสียภาษี: form.coAgentTaxId || form.coAgentNationalId,
        บ้านเลขที่:  form.coAgentAddressNo,
        หมู่ที่:     form.coAgentMoo,
        ซอย:         form.coAgentSoi,
        ถนน:         form.coAgentRoad,
        แขวงตำบล:    form.coAgentSubdistrict,
        เขตอำเภอ:    form.coAgentDistrict,
        จังหวัด:     form.coAgentProvince,
        ธนาคาร:      form.coAgentBankName,
        ชื่อบัญชี:   form.coAgentAccountName,
        เลขบัญชี:    form.coAgentAccountNo,
      } : null

      const result = await createChildDocument(leaseId, selectedType, {
        amount:                    num(form.amount),
        paymentDate:               form.paymentDate || null,
        paymentMethod:             form.paymentMethod,
        bankRef:                   form.bankRef || null,
        periodDate:                form.periodDate || null,
        commissionNet:             num(form.commissionNet),
        coAgentSplitPct:           int(form.coAgentSplitPct),
        coAgentCommission:         num(form.coAgentCommission),
        coAgentInfo:               coAgentInfo,
        coAgentId:                 form.selectedCoAgentId || null,
        coAgentPaymentDirection:   selectedType === 'co_agent' ? form.coAgentPaymentDirection : null,
        vat7:                      form.vat7,
        wht3:                      form.wht3,
        newRentPrice:              num(form.newRentPrice),
        newContractMonths:         int(form.newContractMonths),
        newMoveInDate:             form.newMoveInDate || null,
        newEndDate:                form.newEndDate || null,
        effectiveEndDate:          form.effectiveEndDate || null,
        penaltyAmount:             num(form.penaltyAmount),
        issueDate:                 form.issueDate || null,
        extraVars:                 Object.keys(extraVars).length > 0 ? extraVars : undefined,
      })

      if (result.error) { setError(result.error); return }
      router.push(`/contracts/${result.id}`)
    })
  }

  // ── Inline form rendering ───────────────────────────────────

  function renderForm() {
    if (!selectedType) return null

    const isPaymentDoc = ['invoice_reservation','receipt_reservation','invoice_deposit','receipt_deposit'].includes(selectedType)
    const isReceiptRent  = selectedType === 'receipt_rent'
    const isReceiptBook  = selectedType === 'receipt_book'
    const isCommission   = selectedType === 'commission' || selectedType === 'commission_confirm'
    const isRenewal      = selectedType === 'renewal'
    const isEnding       = ['termination','cancellation','end_contract'].includes(selectedType)
    const isNotification = selectedType === 'notice' || selectedType === 'warning'
    const isCoAgent      = selectedType === 'co_agent'
    const isSchedule     = selectedType === 'installment_schedule'
    const isFurniture    = selectedType === 'furniture_list'

    return (
      <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
        <p className="text-xs font-semibold text-gray-600">
          {DOC_TYPE_LABELS[selectedType]} — กรอกข้อมูลที่ต้องการ (ที่เหลือดึงจากสัญญาหลักอัตโนมัติ)
        </p>

        {(isPaymentDoc || isReceiptBook) && (
          <>
            <Field label="จำนวนเงิน (บาท)" value={form.amount}
              onChange={v => set('amount', v)} type="number"
              hint={
                selectedType === 'invoice_deposit' || selectedType === 'receipt_deposit'
                  ? `เงินประกัน (${leaseData.depositMonths ?? 2} เดือน): ฿${fmt((leaseData.rentPrice ?? 0) * (leaseData.depositMonths ?? 2))}`
                  : selectedType === 'invoice_reservation' || selectedType === 'receipt_reservation'
                  ? `เงินจอง: ฿${fmt(leaseData.bookingAmount ?? leaseData.depositAmount ?? 0)}`
                  : `จากสัญญา: ฿${fmt(leaseData.depositAmount ?? 0)}`
              }
            />
            <Field label="วันที่ชำระ" value={form.paymentDate}
              onChange={v => set('paymentDate', v)} type="date" />
            <SelectField label="วิธีชำระ" value={form.paymentMethod} onChange={v => set('paymentMethod', v)}
              options={[{ value: 'transfer', label: 'โอนเงิน' }, { value: 'cash', label: 'เงินสด' }, { value: 'cheque', label: 'เช็ค' }]}
            />
            <Field label="เลขอ้างอิง" value={form.bankRef} onChange={v => set('bankRef', v)} placeholder="ไม่บังคับ" />
          </>
        )}

        {isReceiptRent && (
          <>
            <Field label="จำนวนเงิน (บาท)" value={form.amount}
              onChange={v => set('amount', v)} type="number"
              hint={`จากสัญญา: ฿${fmt(leaseData.rentPrice ?? 0)}/เดือน`}
            />
            <Field label="ประจำเดือน / วันที่" value={form.periodDate}
              onChange={v => set('periodDate', v)} type="date" />
            <SelectField label="วิธีชำระ" value={form.paymentMethod} onChange={v => set('paymentMethod', v)}
              options={[{ value: 'transfer', label: 'โอนเงิน' }, { value: 'cash', label: 'เงินสด' }, { value: 'cheque', label: 'เช็ค' }]}
            />
            <Field label="เลขอ้างอิง" value={form.bankRef} onChange={v => set('bankRef', v)} placeholder="ไม่บังคับ" />
          </>
        )}

        {isCommission && (
          <>
            <div className="space-y-1">
              <Field label="ค่านายหน้าสุทธิ (บาท)" value={form.commissionNet}
                onChange={handleCommissionChange} type="number"
              />
              {commissionHint(leaseData.contractMonths ?? 0, leaseData.rentPrice ?? 0) && (
                <p className="flex items-center gap-1 text-xs text-violet-600">
                  <Sparkles className="w-3 h-3 flex-shrink-0" />
                  {commissionHint(leaseData.contractMonths ?? 0, leaseData.rentPrice ?? 0)}
                </p>
              )}
              <p className="text-xs text-gray-400">วันรับค่าคอม = วันลงนามสัญญาเช่า (move-in date)</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Toggle label="VAT 7%" checked={form.vat7} onChange={v => set('vat7', v)} />
              <Toggle label="หัก ณ ที่จ่าย 3%" checked={form.wht3} onChange={v => set('wht3', v)} />
            </div>
          </>
        )}

        {isRenewal && (
          <>
            <Field label="ค่าเช่าใหม่ / เดือน (บาท)" value={form.newRentPrice}
              onChange={v => set('newRentPrice', v)} type="number"
              hint={`ปัจจุบัน: ฿${fmt(leaseData.rentPrice ?? 0)}`}
            />
            <Field label="ระยะสัญญาใหม่ (เดือน)" value={form.newContractMonths}
              onChange={handleRenewalContractMonthsChange} type="number" />
            <Field label="วันเริ่มต้นสัญญาใหม่ *" value={form.newMoveInDate}
              onChange={handleRenewalMoveInChange} type="date"
              hint={leaseData.endDate ? `วันหมดสัญญาปัจจุบัน: ${new Date(leaseData.endDate).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}` : undefined}
            />
            <div>
              <label className="block text-xs text-gray-500 mb-1 font-medium">วันสิ้นสุดสัญญาใหม่ (คำนวณอัตโนมัติ)</label>
              <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-600">
                {form.newEndDate
                  ? new Date(form.newEndDate).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })
                  : '—'}
              </div>
            </div>
          </>
        )}

        {isEnding && (
          <>
            <div className="flex items-start gap-2 p-3 bg-rose-50 rounded-lg text-xs text-rose-700">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              <span>วันที่มีผลจะอัปเดตสัญญาเช่าหลักและทรัพย์สินจะกลับเป็น &quot;ว่าง&quot; หลังวันนี้</span>
            </div>
            <Field label="วันที่มีผล (สิ้นสุดสัญญา) *" value={form.effectiveEndDate}
              onChange={v => set('effectiveEndDate', v)} type="date" />
            <Field label="วันที่ทำหนังสือ" value={form.issueDate}
              onChange={v => set('issueDate', v)} type="date" />
            <Field label="ค่าปรับ (บาท)" value={form.penaltyAmount}
              onChange={v => set('penaltyAmount', v)} type="number" placeholder="0" />
          </>
        )}

        {isNotification && (
          <>
            <Field label="วันที่ทำหนังสือ" value={form.issueDate}
              onChange={v => set('issueDate', v)} type="date" />
            <Field label="วันที่มีผล" value={form.effectiveEndDate}
              onChange={v => set('effectiveEndDate', v)} type="date" placeholder="ไม่บังคับ" />
            <TextareaField
              label={selectedType === 'warning' ? 'สาเหตุ / พฤติกรรมที่เตือน *' : 'รายละเอียด / เนื้อหาแจ้ง *'}
              value={form.noticeDetails}
              onChange={v => set('noticeDetails', v)}
              placeholder={selectedType === 'warning'
                ? 'เช่น: ส่งเสียงดังรบกวน, ค้างค่าเช่า, เลี้ยงสัตว์โดยไม่ได้รับอนุญาต'
                : 'เช่น: แจ้งวันหมดสัญญา, แจ้งเรื่องซ่อมบำรุง'}
            />
          </>
        )}

        {isCoAgent && (
          <>
            {/* Profile selector */}
            {coAgents.length > 0 && (
              <div className="mb-1">
                <label className="block text-xs text-gray-500 mb-1 font-medium">เลือก Co-Agent ที่บันทึกไว้</label>
                <div className="flex gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, selectedCoAgentId: '', coAgentName: '', coAgentNationalId: '', coAgentTaxId: '', coAgentAddressNo: '', coAgentMoo: '', coAgentSoi: '', coAgentRoad: '', coAgentSubdistrict: '', coAgentDistrict: '', coAgentProvince: '', coAgentBankName: '', coAgentAccountName: '', coAgentAccountNo: '' }))}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg border text-xs font-medium transition ${!form.selectedCoAgentId ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}
                  >
                    <User className="w-3 h-3" />
                    กรอกใหม่
                  </button>
                  {coAgents.map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleSelectCoAgent(p.id)}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition ${form.selectedCoAgentId === p.id ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}
                    >
                      {[p.prefix_th, p.first_name_th, p.last_name_th].filter(Boolean).join(' ')}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <p className="text-xs font-semibold text-gray-600 mt-1">ข้อมูล Co-Agent</p>
            <Field label="ชื่อ Co-Agent *" value={form.coAgentName}
              onChange={v => set('coAgentName', v)} placeholder="ชื่อเต็ม" />
            <div className="grid grid-cols-2 gap-2">
              <Field label="เลขบัตรประชาชน *" value={form.coAgentNationalId}
                onChange={v => set('coAgentNationalId', v)} placeholder="13 หลัก" />
              <Field label="เลขผู้เสียภาษี" value={form.coAgentTaxId}
                onChange={v => set('coAgentTaxId', v)} placeholder="ถ้าต่างจากบัตร" />
            </div>

            <p className="text-xs font-semibold text-gray-600 mt-1">ที่อยู่</p>
            <div className="grid grid-cols-2 gap-2">
              <Field label="บ้านเลขที่" value={form.coAgentAddressNo}
                onChange={v => set('coAgentAddressNo', v)} placeholder="123/4" />
              <Field label="หมู่ที่" value={form.coAgentMoo}
                onChange={v => set('coAgentMoo', v)} placeholder="ไม่บังคับ" />
              <Field label="ซอย" value={form.coAgentSoi}
                onChange={v => set('coAgentSoi', v)} placeholder="ไม่บังคับ" />
              <Field label="ถนน" value={form.coAgentRoad}
                onChange={v => set('coAgentRoad', v)} placeholder="ถนนสุขุมวิท" />
              <Field label="แขวง/ตำบล" value={form.coAgentSubdistrict}
                onChange={v => set('coAgentSubdistrict', v)} placeholder="คลองเตย" />
              <Field label="เขต/อำเภอ" value={form.coAgentDistrict}
                onChange={v => set('coAgentDistrict', v)} placeholder="คลองเตย" />
              <Field label="จังหวัด" value={form.coAgentProvince}
                onChange={v => set('coAgentProvince', v)} placeholder="กรุงเทพมหานคร" />
            </div>

            <p className="text-xs font-semibold text-gray-600 mt-1">ข้อมูลธนาคาร</p>
            <Field label="ชื่อธนาคาร" value={form.coAgentBankName}
              onChange={v => set('coAgentBankName', v)} placeholder="เช่น กสิกรไทย, ไทยพาณิชย์" />
            <div className="grid grid-cols-2 gap-2">
              <Field label="ชื่อบัญชี" value={form.coAgentAccountName}
                onChange={v => set('coAgentAccountName', v)} placeholder="ชื่อเจ้าของบัญชี" />
              <Field label="เลขบัญชี" value={form.coAgentAccountNo}
                onChange={v => set('coAgentAccountNo', v)} placeholder="xxx-x-xxxxx-x" />
            </div>

            <p className="text-xs font-semibold text-gray-600 mt-1">ทิศทางการชำระเงิน</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'agent_to_co_agent', label: 'Agent → Co-Agent', desc: 'Agent ชำระให้ Co-Agent' },
                { value: 'co_agent_to_agent', label: 'Co-Agent → Agent', desc: 'Co-Agent ชำระให้ Agent' },
              ].map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => set('coAgentPaymentDirection', opt.value)}
                  className={`flex flex-col items-start px-3 py-2 rounded-lg border text-xs transition ${
                    form.coAgentPaymentDirection === opt.value
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  <span className="font-semibold">{opt.label}</span>
                  <span className="text-gray-400 text-[10px]">{opt.desc}</span>
                </button>
              ))}
            </div>

            <p className="text-xs font-semibold text-gray-600 mt-1">คอมมิชชัน</p>
            <div className="space-y-1">
              <Field label="ค่าคอมรวม (บาท)" value={form.commissionNet}
                onChange={handleCommissionChange} type="number"
              />
              {commissionHint(leaseData.contractMonths ?? 0, leaseData.rentPrice ?? 0) && (
                <p className="flex items-center gap-1 text-xs text-violet-600">
                  <Sparkles className="w-3 h-3 flex-shrink-0" />
                  {commissionHint(leaseData.contractMonths ?? 0, leaseData.rentPrice ?? 0)}
                </p>
              )}
            </div>
            <Field label="สัดส่วน Co-Agent (%)" value={form.coAgentSplitPct}
              onChange={handleSplitPctChange} type="number"
              hint="ค่าเริ่มต้น 50% — Co-Agent รับครึ่งหนึ่ง"
            />
            <Field label="จำนวนที่ Co-Agent รับ (บาท)" value={form.coAgentCommission}
              onChange={v => set('coAgentCommission', v)} type="number"
              hint={form.commissionNet && form.coAgentSplitPct
                ? `เราได้: ฿${fmt(calculateCommissionSplit(parseFloat(form.commissionNet) || 0, parseInt(form.coAgentSplitPct) || 0).our_amount)}`
                : undefined}
            />
          </>
        )}

        {(isSchedule || isFurniture) && (
          <div className="px-3 py-2 bg-blue-50 rounded-lg text-xs text-blue-700">
            เอกสารนี้จะสร้างด้วยข้อมูลจากสัญญาเช่า ไม่ต้องกรอกเพิ่ม
          </div>
        )}
      </div>
    )
  }

  // ── Render ──────────────────────────────────────────────────

  const panelTitle = parentCategory === 'reservation'
    ? 'สร้างใบแจ้งหนี้ / ใบเสร็จเงินจอง'
    : 'สร้างเอกสารที่เกี่ยวข้อง'

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50/70">
        <h2 className="text-sm font-semibold text-gray-700">{panelTitle}</h2>
      </div>
      <div className="p-4">
        {!selectedType ? (
          <div className="space-y-4">
            {DOC_GROUPS.map(group => (
              <div key={group.label}>
                <p className="text-xs text-gray-400 mb-2">{group.label}</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {group.types.map(({ type, label }) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => handleSelectType(type)}
                      className={`flex items-center gap-1.5 px-3 py-2.5 rounded-lg border text-xs font-medium transition ${group.color}`}
                    >
                      <Plus className="w-3.5 h-3.5 flex-shrink-0" />
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div>
            <button
              type="button"
              onClick={() => { setSelectedType(null); setError('') }}
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 mb-3 transition"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              เลือกประเภทอื่น
            </button>

            <div className="flex items-center justify-between mb-1">
              <p className="text-sm font-semibold text-gray-800">
                {DOC_TYPE_LABELS[selectedType]}
              </p>
              <button type="button" onClick={() => { setSelectedType(null); setError('') }}
                className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            {renderForm()}

            {error && (
              <div className="mt-3 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                {error}
              </div>
            )}

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => { setSelectedType(null); setError('') }}
                className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-600 text-sm rounded-xl hover:bg-gray-50 transition"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isPending}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition disabled:opacity-40"
              >
                {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                {isPending ? 'กำลังสร้าง...' : 'สร้างเอกสาร'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Sub-components ──────────────────────────────────────────

interface FieldProps {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  placeholder?: string
  hint?: string
}

function Field({ label, value, onChange, type = 'text', placeholder, hint }: FieldProps) {
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-1 font-medium">{label}</label>
      {hint && <p className="text-xs text-gray-400 mb-1">{hint}</p>}
      <div className="relative flex items-center">
        <input
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
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

function TextareaField({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string
}) {
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-1 font-medium">{label}</label>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        rows={3}
        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
      />
    </div>
  )
}

function SelectField({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-1 font-medium">{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
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
