'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  Loader2, ChevronRight, ChevronLeft, Check, FileText, X, Globe, Info, AlertCircle,
} from 'lucide-react'
import { DOC_TYPE_LABELS } from '@/types'
import type { ContractDocType, PaymentMethod } from '@/types'
import { createContract } from './actions'
import {
  searchStocks, searchOwners, searchCustomers, searchContracts,
  type StockSearchResult, type OwnerSearchResult, type CustomerSearchResult, type ContractSearchResult,
} from './search-actions'
import EntityCombobox from '@/components/shared/EntityCombobox'
import {
  TEMPLATE_REGISTRY, TEMPLATE_SUPPORTED_TYPES,
  type LanguageVersion, LANGUAGE_LABELS,
  type TemplateDefinition,
} from '@/lib/contracts/templateRegistry'

// ─── Types ───────────────────────────────────────────────────

interface WizardState {
  doc_type: ContractDocType | ''
  language: LanguageVersion
  stock_id: string
  stock_label: string
  owner_id: string
  owner_label: string
  customer_id: string
  customer_label: string
  rent_price: string
  deposit_months: string
  deposit_amount: string
  contract_months: string
  move_in_date: string
  end_date: string
  cleaning_fee: string
  ac_count: string
  ac_wash_per_unit: string
  penalty_amount: string
  commission_net: string
  vat_7: boolean
  wht_3: boolean
  occupant_count: string
  water_unit_price: string
  electric_unit_price: string
  internet_fee: string
  common_fee: string
  parking_fee: string
  payment_date: string
  payment_method: PaymentMethod
  bank_ref: string
  reservation_expire_date: string
  payment_grace_days: string
  payment_day_of_month: string
  commission_rate_pct: string
  commission_from_owner: string
  commission_from_customer: string
  extra_vars: Record<string, string>
  parent_contract_id: string
  parent_contract_label: string
}

const INIT: WizardState = {
  doc_type: '', language: 'th',
  stock_id: '', stock_label: '',
  owner_id: '', owner_label: '',
  customer_id: '', customer_label: '',
  rent_price: '', deposit_months: '2', deposit_amount: '',
  contract_months: '12', move_in_date: '', end_date: '',
  cleaning_fee: '', ac_count: '', ac_wash_per_unit: '',
  penalty_amount: '', commission_net: '',
  vat_7: false, wht_3: false, occupant_count: '1',
  water_unit_price: '', electric_unit_price: '', internet_fee: '',
  common_fee: '', parking_fee: '',
  payment_date: '', payment_method: 'transfer', bank_ref: '',
  reservation_expire_date: '', payment_grace_days: '5', payment_day_of_month: '',
  commission_rate_pct: '', commission_from_owner: '', commission_from_customer: '',
  extra_vars: {},
  parent_contract_id: '', parent_contract_label: '',
}

// ─── Helpers ─────────────────────────────────────────────────

const DOC_GROUPS = [
  {
    label: 'สัญญา (มี template .docx)',
    types: ['rental', 'reservation', 'renewal', 'co_agent'] as ContractDocType[],
    highlight: true,
  },
  {
    label: 'ยกเลิก / แจ้ง',
    types: ['cancellation', 'termination', 'notice'] as ContractDocType[],
    highlight: false,
  },
  {
    label: 'ใบแจ้งหนี้ / ใบเสร็จ',
    types: ['invoice_reservation', 'receipt_reservation', 'invoice_deposit', 'receipt_deposit', 'receipt_rent', 'receipt_book'] as ContractDocType[],
    highlight: false,
  },
  {
    label: 'คอมมิชชัน',
    types: ['commission', 'commission_confirm'] as ContractDocType[],
    highlight: false,
  },
]

const EXTRA_VAR_FIELDS: Partial<Record<ContractDocType, Array<{ key: string; label: string; required?: boolean }>>> = {
  renewal: [
    { key: 'สัญญาเช่าฉบับเก่าลงวันที่', label: 'วันที่สัญญาเช่าฉบับเดิม', required: true },
  ],
  co_agent: [
    { key: 'ชื่อ', label: 'ชื่อ Co-Agent', required: true },
    { key: 'เลขเสียภาษี', label: 'เลขบัตรประชาชน Co-Agent', required: true },
    { key: 'บ้านเลขที่', label: 'บ้านเลขที่ Co-Agent' },
    { key: 'ถนน', label: 'ถนน Co-Agent' },
    { key: 'แขวงตำบล', label: 'แขวง/ตำบล Co-Agent' },
    { key: 'เขตอำเภอ', label: 'เขต/อำเภอ Co-Agent' },
    { key: 'จังหวัด', label: 'จังหวัด Co-Agent' },
    { key: 'บริษัท (ถ้ามี)', label: 'บริษัท Co-Agent (ถ้ามี)' },
  ],
  rental: [
    { key: 'ตึก', label: 'ตึก/อาคาร' },
    { key: 'ซอย', label: 'ซอย' },
  ],
  reservation: [
    { key: 'ตึก', label: 'ตึก/อาคาร' },
  ],
}

function fmt(n: number): string {
  return new Intl.NumberFormat('th-TH').format(n)
}

function stockLabel(r: StockSearchResult): string {
  return [r.project_name, r.unit_no, r.room_type].filter(Boolean).join(' · ') || r.id
}

function personLabel(r: OwnerSearchResult | CustomerSearchResult): string {
  if (r.nickname) return r.nickname
  return [r.first_name_th, r.last_name_th].filter(Boolean).join(' ') || r.id
}

// ─── Component ───────────────────────────────────────────────

export default function ContractWizard() {
  const router = useRouter()
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1)
  const [state, setState] = useState<WizardState>(INIT)
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()
  const [showErrors, setShowErrors] = useState(false)
  const [stepErrors, setStepErrors] = useState<string[]>([])

  const set = (k: keyof WizardState, v: string | boolean | Record<string, string>) =>
    setState(s => ({ ...s, [k]: v }))

  const setExtra = (key: string, val: string) =>
    setState(s => ({ ...s, extra_vars: { ...s.extra_vars, [key]: val } }))

  const hasTemplate = TEMPLATE_SUPPORTED_TYPES.has(state.doc_type)
  const availableTemplates = TEMPLATE_REGISTRY.filter(t => t.docType === state.doc_type)
  const availableLanguages = availableTemplates.map(t => t.language)
  const selectedTemplate = availableTemplates.find(t => t.language === state.language) ?? availableTemplates[0]

  const isRental      = state.doc_type === 'rental' || state.doc_type === 'renewal'
  const isReservation = state.doc_type === 'reservation'
  const isReceipt     = state.doc_type === 'receipt_rent' || state.doc_type === 'receipt_book'
  const isCommission  = state.doc_type === 'commission'
  const isCommissionConfirm = state.doc_type === 'commission_confirm'
  const isPaymentDoc  = ['invoice_reservation','receipt_reservation','invoice_deposit','receipt_deposit'].includes(state.doc_type)
  const isCoAgent     = state.doc_type === 'co_agent'
  const extraFields   = EXTRA_VAR_FIELDS[state.doc_type as ContractDocType] ?? []
  const isRelatedDoc  = ['cancellation', 'termination', 'notice', 'renewal'].includes(state.doc_type)

  const needsOwner    = isRental || isReservation || isPaymentDoc || isCommission || isCommissionConfirm || isCoAgent
  const needsCustomer = isRental || isReservation || isPaymentDoc || isReceipt

  // ─── Field helpers ──────────────────────────────────────────

  function handleRentChange(v: string) {
    set('rent_price', v)
    const rent = parseFloat(v)
    if (rent > 0) {
      const isResPayment = state.doc_type === 'invoice_reservation' || state.doc_type === 'receipt_reservation'
      set('deposit_amount', isResPayment ? String(rent) : String(rent * (parseFloat(state.deposit_months) || 2)))
    }
  }

  function handleDepositMonthsChange(v: string) {
    set('deposit_months', v)
    const rent = parseFloat(state.rent_price)
    const months = parseFloat(v) || 2
    if (rent > 0) set('deposit_amount', String(rent * months))
  }

  function handleMoveInChange(v: string) {
    set('move_in_date', v)
    const months = parseInt(state.contract_months) || 12
    if (v) {
      const d = new Date(v)
      d.setMonth(d.getMonth() + months)
      set('end_date', d.toISOString().split('T')[0]!)
      if (!state.payment_day_of_month) {
        set('payment_day_of_month', String(new Date(v).getDate()))
      }
    }
  }

  function handleContractMonthsChange(v: string) {
    set('contract_months', v)
    const months = parseInt(v) || 12
    if (state.move_in_date) {
      const d = new Date(state.move_in_date)
      d.setMonth(d.getMonth() + months)
      set('end_date', d.toISOString().split('T')[0]!)
    }
  }

  // ─── Entity select handlers ─────────────────────────────────

  function handleStockSelect(r: StockSearchResult | null) {
    if (!r) {
      setState(s => ({ ...s, stock_id: '', stock_label: '' }))
      return
    }
    setState(s => {
      const next = { ...s, stock_id: r.id, stock_label: stockLabel(r) }
      if (r.owner_id) next.owner_id = r.owner_id
      if (r.rent_price) {
        const rent = r.rent_price
        next.rent_price = String(rent)
        const isResPayment = s.doc_type === 'invoice_reservation' || s.doc_type === 'receipt_reservation'
        next.deposit_amount = isResPayment ? String(rent) : String(rent * (parseFloat(s.deposit_months) || 2))
      }
      return next
    })
  }

  function handleParentContractSelect(r: ContractSearchResult | null) {
    if (!r) {
      setState(s => ({ ...s, parent_contract_id: '', parent_contract_label: '' }))
      return
    }
    const label = [r.id, r.doc_type, r.move_in_date].filter(Boolean).join(' · ')
    setState(s => ({
      ...s,
      parent_contract_id: r.id,
      parent_contract_label: label,
      stock_id: r.stock_id ?? s.stock_id,
      owner_id: r.owner_id ?? s.owner_id,
      customer_id: r.customer_id ?? s.customer_id,
    }))
  }

  function handleOwnerSelect(r: OwnerSearchResult | null) {
    if (!r) { setState(s => ({ ...s, owner_id: '', owner_label: '' })); return }
    setState(s => ({ ...s, owner_id: r.id, owner_label: personLabel(r) }))
  }

  function handleCustomerSelect(r: CustomerSearchResult | null) {
    if (!r) { setState(s => ({ ...s, customer_id: '', customer_label: '' })); return }
    setState(s => ({ ...s, customer_id: r.id, customer_label: personLabel(r) }))
  }

  function handleDocTypeSelect(type: ContractDocType) {
    const templates = TEMPLATE_REGISTRY.filter(t => t.docType === type)
    const defaultLang = templates.find(t => t.language === 'th')?.language ?? templates[0]?.language ?? 'th'
    setState(s => {
      const next: WizardState = { ...s, doc_type: type, language: defaultLang as LanguageVersion }
      // Auto-set reservation amount = 1 month rent when switching to reservation invoice/receipt
      if ((type === 'invoice_reservation' || type === 'receipt_reservation') && s.rent_price) {
        next.deposit_amount = s.rent_price
      }
      return next
    })
  }

  function computeTemplateSlug(template: TemplateDefinition | undefined): string | undefined {
    return template?.slug
  }

  // ─── Validation ─────────────────────────────────────────────

  function validateStep1(): string[] {
    const errs: string[] = []
    if (!state.doc_type) errs.push('กรุณาเลือกประเภทเอกสาร')
    if (!state.stock_id) errs.push('กรุณาเลือกทรัพย์สิน')
    return errs
  }

  function validateStep2(): string[] {
    const errs: string[] = []
    if (needsOwner && !state.owner_id) errs.push('กรุณาเลือกเจ้าของทรัพย์ / ผู้ให้เช่า')
    if (needsCustomer && !state.customer_id) errs.push('กรุณาเลือกลูกค้า / ผู้เช่า')
    return errs
  }

  function validateStep3(): string[] {
    const errs: string[] = []
    if (isRental) {
      if (!state.rent_price) errs.push('กรุณากรอกค่าเช่า / เดือน')
      if (!state.contract_months) errs.push('กรุณาระบุระยะสัญญา (เดือน)')
      if (!state.move_in_date) errs.push('กรุณาระบุวันเข้าอยู่ / เริ่มสัญญา')
    }
    if (isReservation) {
      if (!state.deposit_amount) errs.push('กรุณากรอกเงินจอง')
      if (!state.move_in_date) errs.push('กรุณาระบุวันที่ทำสัญญาจอง')
    }
    if (isReceipt) {
      if (!state.rent_price) errs.push('กรุณากรอกจำนวนเงิน')
      if (!state.move_in_date) errs.push('กรุณาระบุวันที่ / ประจำเดือน')
    }
    if (isCommission || isCommissionConfirm) {
      if (!state.commission_net) errs.push('กรุณากรอกค่านายหน้าสุทธิ')
    }
    if (isPaymentDoc) {
      if (!state.deposit_amount) errs.push('กรุณากรอกจำนวนเงิน')
    }
    if (isCoAgent) {
      if (!state.rent_price) errs.push('กรุณากรอกค่าเช่า')
      if (!state.move_in_date) errs.push('กรุณาระบุวันที่ทำสัญญา')
    }
    extraFields.forEach(f => {
      if (f.required && !state.extra_vars[f.key]) errs.push(`กรุณากรอก${f.label}`)
    })
    return errs
  }

  // ─── Submit ─────────────────────────────────────────────────

  function handleSubmit() {
    if (!state.doc_type) { setError('กรุณาเลือกประเภทเอกสาร'); return }
    setError('')
    startTransition(async () => {
      const num = (v: string) => v.trim() ? parseFloat(v) || null : null
      const int = (v: string) => v.trim() ? parseInt(v) || null : null

      const res = await createContract({
        doc_type:          state.doc_type as ContractDocType,
        language_version:  state.language,
        template_slug:     computeTemplateSlug(selectedTemplate) ?? null,
        stock_id:          state.stock_id || null,
        owner_id:          state.owner_id || null,
        customer_id:       state.customer_id || null,
        rent_price:        num(state.rent_price),
        deposit_months:    num(state.deposit_months),
        deposit_amount:    num(state.deposit_amount),
        contract_months:   num(state.contract_months),
        move_in_date:      state.move_in_date || null,
        end_date:          state.end_date || null,
        cleaning_fee:      num(state.cleaning_fee),
        ac_count:          num(state.ac_count),
        ac_wash_per_unit:  num(state.ac_wash_per_unit),
        penalty_amount:    num(state.penalty_amount),
        commission_net:    num(state.commission_net),
        vat_7:             state.vat_7,
        wht_3:             state.wht_3,
        occupant_count:    int(state.occupant_count),
        water_unit_price:  num(state.water_unit_price),
        electric_unit_price: num(state.electric_unit_price),
        internet_fee:      num(state.internet_fee),
        common_fee:        num(state.common_fee),
        parking_fee:       num(state.parking_fee),
        payment_date:      state.payment_date || null,
        payment_method:    state.payment_method,
        bank_ref:          state.bank_ref || null,
        reservation_expire_date: state.reservation_expire_date || null,
        payment_grace_days: int(state.payment_grace_days),
        payment_day_of_month: int(state.payment_day_of_month),
        commission_rate_pct: num(state.commission_rate_pct),
        commission_from_owner: num(state.commission_from_owner),
        commission_from_customer: num(state.commission_from_customer),
        extra_vars: Object.keys(state.extra_vars).length > 0 ? state.extra_vars : null,
        parent_contract_id: state.parent_contract_id || null,
        contract_relation_type: state.parent_contract_id
          ? (state.doc_type === 'renewal' ? 'renewal' : state.doc_type === 'cancellation' ? 'cancellation' : 'related')
          : null,
      })

      if (res.error) { setError(res.error); return }
      router.push(`/contracts/${res.id}`)
    })
  }

  // ─── Render ──────────────────────────────────────────────────

  const reviewErrors = step === 4 ? [...validateStep1(), ...validateStep2(), ...validateStep3()] : []

  return (
    <div className="space-y-5">
      {/* Progress */}
      <div className="relative mb-1">
        <div className="absolute top-3.5 left-0 right-0 flex items-center px-3.5">
          {[1, 2, 3].map(n => (
            <div key={n} className={`flex-1 h-0.5 ${step > n ? 'bg-blue-600' : 'bg-gray-200'}`} />
          ))}
        </div>
        <div className="relative z-10 flex justify-between">
          {([1, 2, 3, 4] as const).map(n => (
            <div key={n} className="flex flex-col items-center gap-1.5">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition ${
                step > n ? 'bg-blue-600 text-white' :
                step === n ? 'bg-blue-600 text-white ring-4 ring-blue-100' :
                'bg-gray-100 text-gray-400'
              }`}>
                {step > n ? <Check className="w-3.5 h-3.5" /> : n}
              </div>
              <span className="text-[9px] text-gray-400 text-center leading-tight max-w-[3.5rem]">
                {n === 1 ? 'ประเภท+ภาษา' : n === 2 ? 'คู่สัญญา' : n === 3 ? 'รายละเอียด' : 'ยืนยัน'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Step 1: doc_type + language + stock ── */}
      {step === 1 && (
        <div className="space-y-4">
          {DOC_GROUPS.map(group => (
            <Section key={group.label} title={group.label}>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {group.types.map(type => {
                  const isSelected = state.doc_type === type
                  const hasTempl = TEMPLATE_SUPPORTED_TYPES.has(type)
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => handleDocTypeSelect(type)}
                      className={`flex items-start gap-2 p-3 rounded-xl border-2 text-left transition ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-gray-100 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <FileText className={`w-4 h-4 flex-shrink-0 mt-0.5 ${isSelected ? 'text-blue-600' : 'text-gray-400'}`} />
                      <div>
                        <span className={`text-xs font-medium leading-tight block ${isSelected ? 'text-blue-700' : 'text-gray-700'}`}>
                          {DOC_TYPE_LABELS[type]}
                        </span>
                        {hasTempl && (
                          <span className="text-[10px] text-emerald-600 font-medium">มี template</span>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            </Section>
          ))}

          {/* Language selector */}
          {hasTemplate && availableLanguages.length > 0 && (
            <Section title="เลือกภาษาสัญญา">
              <div className="flex items-center gap-2 mb-3 text-xs text-blue-700 bg-blue-50 rounded-lg px-3 py-2">
                <Globe className="w-3.5 h-3.5 flex-shrink-0" />
                <span>Thai เป็น default เสมอ — ตัวเลือกเพิ่มภาษาอังกฤษหรือจีนเพื่อใช้ template 2/3 ภาษา</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {availableLanguages.map(lang => (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => set('language', lang)}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-sm transition ${
                      state.language === lang
                        ? 'border-blue-600 bg-blue-50 text-blue-700 font-medium'
                        : 'border-gray-100 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    {state.language === lang && <Check className="w-3.5 h-3.5 flex-shrink-0" />}
                    {LANGUAGE_LABELS[lang]}
                  </button>
                ))}
              </div>
              {selectedTemplate && (
                <p className="text-xs text-gray-400 mt-2">
                  ไฟล์ template: {selectedTemplate.filename}
                </p>
              )}
            </Section>
          )}

          {/* Property search */}
          <Section title="เลือกทรัพย์สิน *">
            <div className={showErrors && !state.stock_id ? 'ring-2 ring-red-300 rounded-xl' : ''}>
              <EntityCombobox
                kind="stock"
                value={state.stock_id}
                selectedLabel={state.stock_label}
                onSelect={handleStockSelect}
                searchFn={searchStocks}
                placeholder="ค้นหาโครงการ, ห้อง, อาคาร..."
              />
            </div>
            <p className="text-xs text-gray-400 mt-1.5 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block flex-shrink-0" />
              แสดงเฉพาะทรัพย์ที่มีสถานะว่าง (available)
            </p>
            {state.stock_id && state.rent_price && (
              <p className="text-xs text-blue-600 mt-1">ค่าเช่า ฿{fmt(parseFloat(state.rent_price))}/เดือน (จากทรัพย์)</p>
            )}
          </Section>
        </div>
      )}

      {/* ── Step 2: owner + customer ── */}
      {step === 2 && (
        <div className="space-y-4">
          {isRelatedDoc && (
            <Section title="สัญญาต้นทาง (ถ้ามี)">
              <EntityCombobox
                kind="contract"
                value={state.parent_contract_id}
                selectedLabel={state.parent_contract_label}
                onSelect={handleParentContractSelect}
                searchFn={searchContracts}
                placeholder="ค้นหาสัญญาเช่า / จอง (BK-XXXX)..."
              />
              <p className="text-xs text-gray-400 mt-1.5">เมื่อเลือกสัญญาต้นทาง ระบบจะดึงทรัพย์ / เจ้าของ / ผู้เช่าให้อัตโนมัติ</p>
            </Section>
          )}
          <Section title={`เจ้าของทรัพย์ / ผู้ให้เช่า${needsOwner ? ' *' : ''}`}>
            <div className={showErrors && needsOwner && !state.owner_id ? 'ring-2 ring-red-300 rounded-xl' : ''}>
              <EntityCombobox
                kind="owner"
                value={state.owner_id}
                selectedLabel={state.owner_label}
                onSelect={handleOwnerSelect}
                searchFn={searchOwners}
                placeholder="ค้นหาเจ้าของทรัพย์..."
              />
            </div>
            {needsOwner && (
              <p className="text-xs text-gray-400 mt-1.5">* จำเป็นสำหรับเอกสารประเภทนี้</p>
            )}
          </Section>

          <Section title={`ผู้เช่า / ลูกค้า${needsCustomer ? ' *' : ''}`}>
            <div className={showErrors && needsCustomer && !state.customer_id ? 'ring-2 ring-red-300 rounded-xl' : ''}>
              <EntityCombobox
                kind="customer"
                value={state.customer_id}
                selectedLabel={state.customer_label}
                onSelect={handleCustomerSelect}
                searchFn={searchCustomers}
                placeholder="ค้นหาลูกค้า / ผู้เช่า..."
              />
            </div>
            {needsCustomer && (
              <p className="text-xs text-gray-400 mt-1.5">* จำเป็นสำหรับเอกสารประเภทนี้</p>
            )}
          </Section>
        </div>
      )}

      {/* ── Step 3: financial details ── */}
      {step === 3 && (
        <div className="space-y-4">
          {isRental && (
            <>
              <Section title="ราคาและมัดจำ">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="ค่าเช่า / เดือน (บาท)" value={state.rent_price} onChange={handleRentChange} type="number" placeholder="0" required hasError={showErrors && !state.rent_price} />
                  <Field label="จำนวนเดือนมัดจำ" value={state.deposit_months} onChange={handleDepositMonthsChange} type="number" placeholder="2" />
                  <Field label="เงินมัดจำ (บาท)" value={state.deposit_amount} onChange={v => set('deposit_amount', v)} type="number" placeholder="คำนวณอัตโนมัติ" />
                  <Field label="ระยะสัญญา (เดือน)" value={state.contract_months} onChange={handleContractMonthsChange} type="number" placeholder="12" required hasError={showErrors && !state.contract_months} />
                  <Field label="วันที่เข้าอยู่" value={state.move_in_date} onChange={handleMoveInChange} type="date" required hasError={showErrors && !state.move_in_date} />
                  <Field label="วันสิ้นสุดสัญญา" value={state.end_date} onChange={v => set('end_date', v)} type="date" />
                  <Field label="จำนวนผู้พักอาศัย" value={state.occupant_count} onChange={v => set('occupant_count', v)} type="number" placeholder="1" />
                </div>
              </Section>

              <Section title="ค่าใช้จ่ายรายเดือน">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="ค่าน้ำ / หน่วย (บาท)" value={state.water_unit_price} onChange={v => set('water_unit_price', v)} type="number" placeholder="0" />
                  <Field label="ค่าไฟ / หน่วย (บาท)" value={state.electric_unit_price} onChange={v => set('electric_unit_price', v)} type="number" placeholder="0" />
                  <Field label="ค่าอินเตอร์เน็ต / เดือน (บาท)" value={state.internet_fee} onChange={v => set('internet_fee', v)} type="number" placeholder="0" />
                  <Field label="ค่าส่วนกลาง / เดือน (บาท)" value={state.common_fee} onChange={v => set('common_fee', v)} type="number" placeholder="0" />
                  <Field label="ค่าจอดรถ / เดือน (บาท)" value={state.parking_fee} onChange={v => set('parking_fee', v)} type="number" placeholder="0" />
                </div>
              </Section>

              <Section title="เงื่อนไขการชำระ">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="ชำระทุกวันที่ (1–31)" value={state.payment_day_of_month} onChange={v => set('payment_day_of_month', v)} type="number" placeholder="ดึงจากวันเข้าอยู่" />
                  <Field label="ผ่อนผันชำระได้ไม่เกิน (วัน)" value={state.payment_grace_days} onChange={v => set('payment_grace_days', v)} type="number" placeholder="5" />
                </div>
              </Section>

              <Section title="ค่าใช้จ่ายเพิ่มเติม">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="ค่าทำความสะอาด (บาท)" value={state.cleaning_fee} onChange={v => set('cleaning_fee', v)} type="number" placeholder="0" />
                  <Field label="จำนวนแอร์" value={state.ac_count} onChange={v => set('ac_count', v)} type="number" placeholder="0" />
                  <Field label="ค่าล้างแอร์ / เครื่อง (บาท)" value={state.ac_wash_per_unit} onChange={v => set('ac_wash_per_unit', v)} type="number" placeholder="0" />
                  <Field label="ค่าปรับผิดนัด (บาท)" value={state.penalty_amount} onChange={v => set('penalty_amount', v)} type="number" placeholder="0" />
                </div>
                <div className="flex flex-wrap gap-3 mt-4">
                  <Toggle label="VAT 7%" checked={state.vat_7} onChange={v => set('vat_7', v)} />
                  <Toggle label="หัก ณ ที่จ่าย 3%" checked={state.wht_3} onChange={v => set('wht_3', v)} />
                </div>
              </Section>

              <Section title="ค่าคอมมิชชัน">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Field label="อัตราค่าคอม (%)" value={state.commission_rate_pct} onChange={v => set('commission_rate_pct', v)} type="number" placeholder="0" />
                  <Field label="ค่าคอมจากเจ้าของ (บาท)" value={state.commission_from_owner} onChange={v => set('commission_from_owner', v)} type="number" placeholder="0" />
                  <Field label="ค่าคอมจากลูกค้า (บาท)" value={state.commission_from_customer} onChange={v => set('commission_from_customer', v)} type="number" placeholder="0" />
                </div>
              </Section>
            </>
          )}

          {state.doc_type === 'renewal' && (
            <Section title="รายละเอียดต่อสัญญา">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="ค่าเช่า / เดือน (บาท)" value={state.rent_price} onChange={handleRentChange} type="number" placeholder="0" required hasError={showErrors && !state.rent_price} />
                <Field label="ระยะเวลาต่อสัญญา (เดือน)" value={state.contract_months} onChange={handleContractMonthsChange} type="number" placeholder="12" required hasError={showErrors && !state.contract_months} />
                <Field label="วันเริ่มต่อสัญญา" value={state.move_in_date} onChange={handleMoveInChange} type="date" required hasError={showErrors && !state.move_in_date} />
                <Field label="วันสิ้นสุดสัญญาใหม่" value={state.end_date} onChange={v => set('end_date', v)} type="date" />
              </div>
            </Section>
          )}

          {isReservation && (
            <>
              <Section title="เงื่อนไขการจอง">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="เงินจอง (บาท)" value={state.deposit_amount} onChange={v => set('deposit_amount', v)} type="number" placeholder="0" required hasError={showErrors && !state.deposit_amount} />
                  <Field label="ค่าเช่าต่อเดือน (บาท)" value={state.rent_price} onChange={handleRentChange} type="number" placeholder="0" />
                  <Field label="ค่าปรับกรณียกเลิก (บาท)" value={state.penalty_amount} onChange={v => set('penalty_amount', v)} type="number" placeholder="0" />
                  <Field label="วันที่ทำสัญญาจอง" value={state.move_in_date} onChange={v => set('move_in_date', v)} type="date" required hasError={showErrors && !state.move_in_date} />
                  <Field label="วันหมดอายุการจอง" value={state.reservation_expire_date} onChange={v => set('reservation_expire_date', v)} type="date" />
                </div>
                <div className="flex flex-wrap gap-3 mt-4">
                  <Toggle label="VAT 7%" checked={state.vat_7} onChange={v => set('vat_7', v)} />
                  <Toggle label="หัก ณ ที่จ่าย 3%" checked={state.wht_3} onChange={v => set('wht_3', v)} />
                </div>
              </Section>
              <Section title="การชำระเงิน">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="วันที่ชำระ" value={state.payment_date} onChange={v => set('payment_date', v)} type="date" />
                  <SelectField label="วิธีชำระ" value={state.payment_method} onChange={v => set('payment_method', v)} options={[
                    { value: 'transfer', label: 'โอนเงิน' },
                    { value: 'cash', label: 'เงินสด' },
                    { value: 'cheque', label: 'เช็ค' },
                  ]} />
                  <Field label="เลขอ้างอิง / เลขเช็ค" value={state.bank_ref} onChange={v => set('bank_ref', v)} placeholder="ไม่บังคับ" />
                </div>
              </Section>
            </>
          )}

          {isPaymentDoc && (
            <Section title="รายละเอียดการชำระเงิน">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="จำนวนเงิน (บาท)" value={state.deposit_amount} onChange={v => set('deposit_amount', v)} type="number" placeholder="0" required hasError={showErrors && !state.deposit_amount} />
                <Field label="วันที่ชำระ" value={state.payment_date} onChange={v => set('payment_date', v)} type="date" />
                <SelectField label="วิธีชำระ" value={state.payment_method} onChange={v => set('payment_method', v)} options={[
                  { value: 'transfer', label: 'โอนเงิน' },
                  { value: 'cash', label: 'เงินสด' },
                  { value: 'cheque', label: 'เช็ค' },
                ]} />
                <Field label="เลขอ้างอิง / เลขเช็ค" value={state.bank_ref} onChange={v => set('bank_ref', v)} placeholder="ไม่บังคับ" />
              </div>
            </Section>
          )}

          {isReceipt && (
            <Section title="รายละเอียดการชำระเงิน">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="จำนวนเงิน (บาท)" value={state.rent_price} onChange={v => set('rent_price', v)} type="number" placeholder="0" required hasError={showErrors && !state.rent_price} />
                <Field label="ประจำเดือน (วันที่)" value={state.move_in_date} onChange={v => set('move_in_date', v)} type="date" required hasError={showErrors && !state.move_in_date} />
              </div>
            </Section>
          )}

          {(isCommission || isCommissionConfirm) && (
            <Section title="ค่านายหน้า">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="ค่านายหน้าสุทธิ (บาท)" value={state.commission_net} onChange={v => set('commission_net', v)} type="number" placeholder="0" required hasError={showErrors && !state.commission_net} />
                <Field label="ค่าเช่า / เดือน (บาท)" value={state.rent_price} onChange={v => set('rent_price', v)} type="number" placeholder="0" />
                <Field label="ค่าคอมจากเจ้าของ (บาท)" value={state.commission_from_owner} onChange={v => set('commission_from_owner', v)} type="number" placeholder="0" />
                <Field label="ค่าคอมจากลูกค้า (บาท)" value={state.commission_from_customer} onChange={v => set('commission_from_customer', v)} type="number" placeholder="0" />
              </div>
              <div className="flex gap-4 mt-4">
                <Toggle label="VAT 7%" checked={state.vat_7} onChange={v => set('vat_7', v)} />
                <Toggle label="หัก ณ ที่จ่าย 3%" checked={state.wht_3} onChange={v => set('wht_3', v)} />
              </div>
            </Section>
          )}

          {isCoAgent && (
            <Section title="รายละเอียด Co-Agent">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="ค่าเช่า / เดือน (บาท)" value={state.rent_price} onChange={handleRentChange} type="number" placeholder="0" required hasError={showErrors && !state.rent_price} />
                <Field label="ระยะสัญญา (เดือน)" value={state.contract_months} onChange={v => set('contract_months', v)} type="number" placeholder="12" />
                <Field label="วันที่ทำสัญญา" value={state.move_in_date} onChange={v => set('move_in_date', v)} type="date" required hasError={showErrors && !state.move_in_date} />
              </div>
            </Section>
          )}

          {extraFields.length > 0 && (
            <Section title="ข้อมูลเพิ่มเติมสำหรับ template">
              <div className="flex items-start gap-2 mb-3 text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
                <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                <span>ข้อมูลด้านล่างจำเป็นสำหรับ template ที่เลือก กรอกให้ครบเพื่อป้องกันข้อมูลขาด</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {extraFields.map(f => (
                  <Field
                    key={f.key}
                    label={f.label}
                    value={state.extra_vars[f.key] ?? ''}
                    onChange={v => setExtra(f.key, v)}
                    placeholder={f.required ? 'จำเป็น' : 'ไม่บังคับ'}
                    required={f.required}
                    hasError={showErrors && !!f.required && !state.extra_vars[f.key]}
                  />
                ))}
              </div>
            </Section>
          )}

          {!isRental && !isReservation && !isReceipt && !isCommission && !isCommissionConfirm && !isPaymentDoc && !isCoAgent && state.doc_type !== 'renewal' && (
            <Section title="รายละเอียด">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="ค่าปรับ (บาท)" value={state.penalty_amount} onChange={v => set('penalty_amount', v)} type="number" placeholder="0" />
                <Field label="วันที่มีผล" value={state.move_in_date} onChange={v => set('move_in_date', v)} type="date" />
              </div>
            </Section>
          )}
        </div>
      )}

      {/* ── Step 4: Review ── */}
      {step === 4 && (
        <div className="space-y-4">
          <Section title="สรุปสัญญา">
            <div className="space-y-3">
              <ReviewRow label="ประเภทเอกสาร" value={state.doc_type ? DOC_TYPE_LABELS[state.doc_type as ContractDocType] : '-'} />
              {hasTemplate && selectedTemplate && (
                <ReviewRow label="ภาษา" value={LANGUAGE_LABELS[state.language]} />
              )}
              {hasTemplate && selectedTemplate && (
                <ReviewRow label="Template" value={selectedTemplate.filename} />
              )}
              {state.stock_label && (
                <ReviewRow label="ทรัพย์" value={state.stock_label} />
              )}
              {state.owner_label && (
                <ReviewRow label="เจ้าของ" value={state.owner_label} />
              )}
              {state.customer_label && (
                <ReviewRow label="ลูกค้า" value={state.customer_label} />
              )}
              {state.rent_price && <ReviewRow label="ค่าเช่า / เดือน" value={`฿${fmt(parseFloat(state.rent_price))}`} />}
              {state.deposit_amount && <ReviewRow label="เงินมัดจำ / จอง" value={`฿${fmt(parseFloat(state.deposit_amount))}`} />}
              {state.contract_months && <ReviewRow label="ระยะสัญญา" value={`${state.contract_months} เดือน`} />}
              {state.move_in_date && <ReviewRow label="วันเข้าอยู่" value={new Date(state.move_in_date).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })} />}
              {state.end_date && <ReviewRow label="วันสิ้นสุด" value={new Date(state.end_date).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })} />}
            </div>
          </Section>

          {reviewErrors.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <span className="text-sm font-semibold text-amber-800">ข้อมูลบางส่วนยังไม่ครบ</span>
              </div>
              <ul className="ml-6 space-y-0.5">
                {reviewErrors.map((e, i) => <li key={i} className="text-xs text-amber-700">• {e}</li>)}
              </ul>
              <div className="flex gap-2 pt-1 flex-wrap">
                {validateStep1().length > 0 && (
                  <button type="button" onClick={() => { setStep(1); setShowErrors(true); setStepErrors(validateStep1()) }} className="text-xs px-2.5 py-1.5 border border-amber-300 text-amber-700 rounded-lg hover:bg-amber-100 transition">
                    แก้ขั้นที่ 1 — ทรัพย์
                  </button>
                )}
                {validateStep2().length > 0 && (
                  <button type="button" onClick={() => { setStep(2); setShowErrors(true); setStepErrors(validateStep2()) }} className="text-xs px-2.5 py-1.5 border border-amber-300 text-amber-700 rounded-lg hover:bg-amber-100 transition">
                    แก้ขั้นที่ 2 — คู่สัญญา
                  </button>
                )}
                {validateStep3().length > 0 && (
                  <button type="button" onClick={() => { setStep(3); setShowErrors(true); setStepErrors(validateStep3()) }} className="text-xs px-2.5 py-1.5 border border-amber-300 text-amber-700 rounded-lg hover:bg-amber-100 transition">
                    แก้ขั้นที่ 3 — รายละเอียด
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-700">
            สัญญาจะถูกบันทึกในสถานะ <strong>ร่าง</strong> — คุณสามารถ preview และดาวน์โหลด .docx ได้ในหน้าถัดไป
            {hasTemplate && (
              <span className="block mt-1 text-xs">
                สำหรับสัญญาเช่า (rental) มีช่อง <strong>รายการเฟอร์นิเจอร์</strong> ให้กรอกในหน้าถัดไปด้วย
              </span>
            )}
          </div>
        </div>
      )}

      {/* Step validation errors */}
      {stepErrors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-start gap-2.5 mb-2">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
            <span className="text-sm font-semibold text-red-700">กรุณากรอกข้อมูลที่จำเป็น</span>
          </div>
          <ul className="ml-6 space-y-0.5">
            {stepErrors.map((e, i) => <li key={i} className="text-xs text-red-600">• {e}</li>)}
          </ul>
        </div>
      )}

      {/* General error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Navigation */}
      <div className="flex gap-3 pt-2 pb-8">
        {step > 1 && (
          <button
            type="button"
            onClick={() => {
              setStepErrors([])
              setShowErrors(false)
              setError('')
              setStep(s => (s - 1) as 1 | 2 | 3 | 4)
            }}
            className="flex items-center gap-1.5 px-4 py-2.5 border border-gray-200 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50 transition"
          >
            <ChevronLeft className="w-4 h-4" />
            ย้อนกลับ
          </button>
        )}
        <div className="flex-1" />
        {step < 4 && (
          <button
            type="button"
            onClick={() => {
              const errs = step === 1 ? validateStep1() :
                           step === 2 ? validateStep2() :
                           step === 3 ? validateStep3() : []
              if (errs.length > 0) {
                setStepErrors(errs)
                setShowErrors(true)
                setError('')
                return
              }
              setStepErrors([])
              setShowErrors(false)
              setError('')
              setStep(s => (s + 1) as 1 | 2 | 3 | 4)
            }}
            className="flex items-center gap-1.5 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition"
          >
            ถัดไป
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
        {step === 4 && (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isPending || reviewErrors.length > 0}
            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            {isPending ? 'กำลังสร้าง...' : 'สร้างสัญญา'}
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Sub-components ──────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-visible">
      <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50/70 rounded-t-xl">
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
  required?: boolean
  hasError?: boolean
}

function Field({ label, value, onChange, placeholder, type = 'text', required, hasError }: FieldProps) {
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-1.5 font-medium">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      <div className="relative flex items-center">
        <input
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full px-3 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 transition pr-8 ${
            hasError ? 'border-red-300 bg-red-50/60 focus:ring-red-200' : 'border-gray-200 focus:ring-blue-500'
          }`}
        />
        {type === 'date' && value && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute right-2.5 text-gray-400 hover:text-gray-600"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  )
}

interface SelectFieldProps {
  label: string
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
}

function SelectField({ label, value, onChange, options }: SelectFieldProps) {
  return (
    <div>
      <Label>{label}</Label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
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
      className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm transition whitespace-nowrap ${
        checked ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600'
      }`}
    >
      <div className={`relative flex-shrink-0 w-9 h-5 rounded-full transition-colors ${checked ? 'bg-blue-600' : 'bg-gray-200'}`}>
        <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-4' : 'translate-x-0.5'}`} />
      </div>
      {label}
    </button>
  )
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-xs text-gray-500 w-32 flex-shrink-0 pt-0.5">{label}</span>
      <span className="text-sm font-medium text-gray-900">{value}</span>
    </div>
  )
}
