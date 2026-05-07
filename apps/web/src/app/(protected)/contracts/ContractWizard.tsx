'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, ChevronRight, ChevronLeft, Check, FileText } from 'lucide-react'
import { DOC_TYPE_LABELS } from '@/types'
import type { ContractDocType, Owner, Customer } from '@/types'
import { createContract } from './actions'

// ─── Types ───────────────────────────────────────────────────

type StockOption = {
  id: string
  project_name?: string | null
  unit_no?: string | null
  room_type?: string | null
  status: string
  owner_id?: string | null
  rent_price?: number | null
  sale_price?: number | null
}

type OwnerOption = Pick<Owner, 'id' | 'nickname' | 'first_name_th' | 'last_name_th' | 'phone'>
type CustomerOption = Pick<Customer, 'id' | 'nickname' | 'first_name_th' | 'last_name_th' | 'phone'>

interface WizardState {
  doc_type: ContractDocType | ''
  stock_id: string
  owner_id: string
  customer_id: string
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
}

const INIT: WizardState = {
  doc_type: '', stock_id: '', owner_id: '', customer_id: '',
  rent_price: '', deposit_months: '2', deposit_amount: '',
  contract_months: '12', move_in_date: '', end_date: '',
  cleaning_fee: '', ac_count: '', ac_wash_per_unit: '',
  penalty_amount: '', commission_net: '',
  vat_7: false, wht_3: false,
}

interface Props {
  stocks: StockOption[]
  owners: OwnerOption[]
  customers: CustomerOption[]
}

// ─── Helpers ─────────────────────────────────────────────────

const DOC_GROUPS = [
  {
    label: 'สัญญา',
    types: ['rental', 'reservation', 'renewal'] as ContractDocType[],
    color: 'blue',
  },
  {
    label: 'ยกเลิก / แจ้ง',
    types: ['cancellation', 'termination', 'notice'] as ContractDocType[],
    color: 'red',
  },
  {
    label: 'ใบเสร็จ',
    types: ['receipt_rent', 'receipt_book', 'commission'] as ContractDocType[],
    color: 'green',
  },
]

const STATUS_COLORS: Record<string, string> = {
  available: 'text-green-600',
  rented: 'text-blue-600',
  sold: 'text-purple-600',
  unavailable: 'text-gray-400',
}

function fmt(n: number): string {
  return new Intl.NumberFormat('th-TH').format(n)
}

function displayName(o: OwnerOption | CustomerOption): string {
  if (o.nickname) return o.nickname
  return [o.first_name_th, o.last_name_th].filter(Boolean).join(' ') || o.id
}

// ─── Component ───────────────────────────────────────────────

export default function ContractWizard({ stocks, owners, customers }: Props) {
  const router = useRouter()
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1)
  const [state, setState] = useState<WizardState>(INIT)
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  const set = (k: keyof WizardState, v: string | boolean) =>
    setState(s => ({ ...s, [k]: v }))

  const selectedStock = stocks.find(s => s.id === state.stock_id)
  const isRental = state.doc_type === 'rental' || state.doc_type === 'renewal'
  const isReceipt = state.doc_type === 'receipt_rent' || state.doc_type === 'receipt_book'
  const isCommission = state.doc_type === 'commission'
  const isReservation = state.doc_type === 'reservation'

  // Auto-calc deposit when rent or months change
  function handleRentChange(v: string) {
    set('rent_price', v)
    const rent = parseFloat(v)
    const months = parseFloat(state.deposit_months) || 2
    if (rent > 0) set('deposit_amount', String(rent * months))
  }

  function handleDepositMonthsChange(v: string) {
    set('deposit_months', v)
    const rent = parseFloat(state.rent_price)
    const months = parseFloat(v) || 2
    if (rent > 0) set('deposit_amount', String(rent * months))
  }

  // Auto-calc end_date when move_in + months change
  function handleMoveInChange(v: string) {
    set('move_in_date', v)
    const months = parseInt(state.contract_months) || 12
    if (v) {
      const d = new Date(v)
      d.setMonth(d.getMonth() + months)
      set('end_date', d.toISOString().split('T')[0]!)
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

  function handleStockSelect(stockId: string) {
    set('stock_id', stockId)
    const stock = stocks.find(s => s.id === stockId)
    if (stock?.owner_id) set('owner_id', stock.owner_id)
    if (stock?.rent_price) handleRentChange(String(stock.rent_price))
  }

  function handleSubmit() {
    if (!state.doc_type) { setError('กรุณาเลือกประเภทเอกสาร'); return }
    setError('')
    startTransition(async () => {
      const num = (v: string) => v.trim() ? parseFloat(v) || null : null

      const res = await createContract({
        doc_type: state.doc_type as ContractDocType,
        stock_id: state.stock_id || null,
        owner_id: state.owner_id || null,
        customer_id: state.customer_id || null,
        rent_price: num(state.rent_price),
        deposit_months: num(state.deposit_months),
        deposit_amount: num(state.deposit_amount),
        contract_months: num(state.contract_months),
        move_in_date: state.move_in_date || null,
        end_date: state.end_date || null,
        cleaning_fee: num(state.cleaning_fee),
        ac_count: num(state.ac_count),
        ac_wash_per_unit: num(state.ac_wash_per_unit),
        penalty_amount: num(state.penalty_amount),
        commission_net: num(state.commission_net),
        vat_7: state.vat_7,
        wht_3: state.wht_3,
      })

      if (res.error) { setError(res.error); return }
      router.push(`/contracts/${res.id}`)
    })
  }

  // ─── Steps ─────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      {/* Progress bar */}
      <div className="flex items-center gap-2">
        {([1, 2, 3, 4] as const).map(n => (
          <div key={n} className="flex items-center gap-2 flex-1">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition ${
              step > n ? 'bg-blue-600 text-white' :
              step === n ? 'bg-blue-600 text-white ring-4 ring-blue-100' :
              'bg-gray-100 text-gray-400'
            }`}>
              {step > n ? <Check className="w-3.5 h-3.5" /> : n}
            </div>
            {n < 4 && <div className={`flex-1 h-0.5 ${step > n ? 'bg-blue-600' : 'bg-gray-200'}`} />}
          </div>
        ))}
      </div>
      <div className="flex justify-between text-xs text-gray-400 -mt-2">
        <span>ประเภท</span>
        <span>คู่สัญญา</span>
        <span>รายละเอียด</span>
        <span>ยืนยัน</span>
      </div>

      {/* ── Step 1: doc_type + stock ── */}
      {step === 1 && (
        <div className="space-y-4">
          {DOC_GROUPS.map(group => (
            <Section key={group.label} title={group.label}>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {group.types.map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => set('doc_type', type)}
                    className={`flex items-center gap-2.5 p-3 rounded-xl border-2 text-left transition ${
                      state.doc_type === type
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-100 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <FileText className={`w-5 h-5 flex-shrink-0 ${state.doc_type === type ? 'text-blue-600' : 'text-gray-400'}`} />
                    <span className={`text-sm font-medium ${state.doc_type === type ? 'text-blue-700' : 'text-gray-700'}`}>
                      {DOC_TYPE_LABELS[type]}
                    </span>
                  </button>
                ))}
              </div>
            </Section>
          ))}

          {/* Stock selection */}
          <Section title="เลือกทรัพย์ (ไม่บังคับ)">
            <select
              value={state.stock_id}
              onChange={e => handleStockSelect(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">— เลือกทรัพย์ —</option>
              {stocks.map(s => (
                <option key={s.id} value={s.id}>
                  {s.id} · {[s.project_name, s.unit_no, s.room_type].filter(Boolean).join(' · ')}
                </option>
              ))}
            </select>
            {selectedStock && (
              <p className={`text-xs mt-1.5 ${STATUS_COLORS[selectedStock.status] ?? 'text-gray-500'}`}>
                สถานะ: {selectedStock.status === 'available' ? 'ว่าง' : selectedStock.status === 'rented' ? 'เช่าแล้ว' : selectedStock.status === 'sold' ? 'ขายแล้ว' : 'ไม่ว่าง'}
                {selectedStock.rent_price ? ` • ค่าเช่า ฿${fmt(selectedStock.rent_price)}/เดือน` : ''}
              </p>
            )}
          </Section>
        </div>
      )}

      {/* ── Step 2: owner + customer ── */}
      {step === 2 && (
        <div className="space-y-4">
          <Section title="เจ้าของทรัพย์ / ผู้ให้เช่า">
            <select
              value={state.owner_id}
              onChange={e => set('owner_id', e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">— เลือกเจ้าของทรัพย์ —</option>
              {owners.map(o => (
                <option key={o.id} value={o.id}>
                  {displayName(o)}{o.phone ? ` · ${o.phone}` : ''}
                </option>
              ))}
            </select>
          </Section>

          <Section title="ผู้เช่า / ลูกค้า">
            <select
              value={state.customer_id}
              onChange={e => set('customer_id', e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">— เลือกลูกค้า —</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>
                  {displayName(c)}{c.phone ? ` · ${c.phone}` : ''}
                </option>
              ))}
            </select>
          </Section>
        </div>
      )}

      {/* ── Step 3: financial ── */}
      {step === 3 && (
        <div className="space-y-4">
          {isRental && (
            <>
              <Section title="ราคาและมัดจำ">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="ค่าเช่า / เดือน (บาท)" value={state.rent_price} onChange={handleRentChange} type="number" placeholder="0" />
                  <Field label="จำนวนเดือนมัดจำ" value={state.deposit_months} onChange={handleDepositMonthsChange} type="number" placeholder="2" />
                  <Field label="เงินมัดจำ (บาท)" value={state.deposit_amount} onChange={v => set('deposit_amount', v)} type="number" placeholder="คำนวณอัตโนมัติ" />
                  <Field label="ระยะสัญญา (เดือน)" value={state.contract_months} onChange={handleContractMonthsChange} type="number" placeholder="12" />
                  <Field label="วันที่เข้าอยู่" value={state.move_in_date} onChange={handleMoveInChange} type="date" />
                  <Field label="วันสิ้นสุดสัญญา" value={state.end_date} onChange={v => set('end_date', v)} type="date" />
                </div>
              </Section>
              <Section title="ค่าใช้จ่ายเพิ่มเติม">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="ค่าทำความสะอาด (บาท)" value={state.cleaning_fee} onChange={v => set('cleaning_fee', v)} type="number" placeholder="0" />
                  <Field label="จำนวนแอร์" value={state.ac_count} onChange={v => set('ac_count', v)} type="number" placeholder="0" />
                  <Field label="ค่าล้างแอร์ / เครื่อง (บาท)" value={state.ac_wash_per_unit} onChange={v => set('ac_wash_per_unit', v)} type="number" placeholder="0" />
                  <Field label="ค่าปรับผิดนัด (บาท)" value={state.penalty_amount} onChange={v => set('penalty_amount', v)} type="number" placeholder="0" />
                </div>
                <div className="flex gap-4 mt-4">
                  <Toggle label="VAT 7%" checked={state.vat_7} onChange={v => set('vat_7', v)} />
                  <Toggle label="หัก ณ ที่จ่าย 3%" checked={state.wht_3} onChange={v => set('wht_3', v)} />
                </div>
              </Section>
            </>
          )}

          {isReservation && (
            <Section title="เงื่อนไขการจอง">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="เงินจอง (บาท)" value={state.deposit_amount} onChange={v => set('deposit_amount', v)} type="number" placeholder="0" />
                <Field label="ค่าปรับกรณียกเลิก (บาท)" value={state.penalty_amount} onChange={v => set('penalty_amount', v)} type="number" placeholder="0" />
                <Field label="วันที่จอง" value={state.move_in_date} onChange={v => set('move_in_date', v)} type="date" />
              </div>
            </Section>
          )}

          {(isReceipt) && (
            <Section title="รายละเอียดการชำระเงิน">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="จำนวนเงิน (บาท)" value={state.rent_price} onChange={v => set('rent_price', v)} type="number" placeholder="0" />
                <Field label="ประจำเดือน (วันที่)" value={state.move_in_date} onChange={v => set('move_in_date', v)} type="date" />
              </div>
            </Section>
          )}

          {isCommission && (
            <Section title="ค่านายหน้า">
              <div className="space-y-4">
                <Field label="ค่านายหน้าสุทธิ (บาท)" value={state.commission_net} onChange={v => set('commission_net', v)} type="number" placeholder="0" />
                <div className="flex gap-4">
                  <Toggle label="VAT 7%" checked={state.vat_7} onChange={v => set('vat_7', v)} />
                  <Toggle label="หัก ณ ที่จ่าย 3%" checked={state.wht_3} onChange={v => set('wht_3', v)} />
                </div>
              </div>
            </Section>
          )}

          {!isRental && !isReservation && !isReceipt && !isCommission && (
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
              {selectedStock && (
                <ReviewRow label="ทรัพย์" value={[selectedStock.project_name, selectedStock.unit_no, selectedStock.room_type].filter(Boolean).join(' · ')} />
              )}
              {state.owner_id && (
                <ReviewRow label="เจ้าของ" value={displayName(owners.find(o => o.id === state.owner_id) ?? { id: state.owner_id })} />
              )}
              {state.customer_id && (
                <ReviewRow label="ลูกค้า" value={displayName(customers.find(c => c.id === state.customer_id) ?? { id: state.customer_id })} />
              )}
              {state.rent_price && <ReviewRow label="ค่าเช่า / เดือน" value={`฿${fmt(parseFloat(state.rent_price))}`} />}
              {state.deposit_amount && <ReviewRow label="เงินมัดจำ" value={`฿${fmt(parseFloat(state.deposit_amount))}`} />}
              {state.contract_months && <ReviewRow label="ระยะสัญญา" value={`${state.contract_months} เดือน`} />}
              {state.move_in_date && <ReviewRow label="วันเข้าอยู่" value={new Date(state.move_in_date).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })} />}
              {state.end_date && <ReviewRow label="วันสิ้นสุด" value={new Date(state.end_date).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })} />}
              {state.commission_net && <ReviewRow label="ค่านายหน้า" value={`฿${fmt(parseFloat(state.commission_net))}`} />}
            </div>
          </Section>

          <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-700">
            สัญญาจะถูกบันทึกในสถานะ <strong>ร่าง</strong> — คุณสามารถสร้าง PDF และเปลี่ยนสถานะได้ในหน้าถัดไป
          </div>
        </div>
      )}

      {/* Error */}
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
            onClick={() => setStep(s => (s - 1) as 1 | 2 | 3 | 4)}
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
              if (step === 1 && !state.doc_type) { setError('กรุณาเลือกประเภทเอกสาร'); return }
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
            disabled={isPending}
            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition disabled:opacity-50"
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
}

function Field({ label, value, onChange, placeholder, type = 'text' }: FieldProps) {
  return (
    <div>
      <Label>{label}</Label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
      />
    </div>
  )
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm transition ${
        checked ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600'
      }`}
    >
      <div className={`relative w-9 h-5 rounded-full transition-colors ${checked ? 'bg-blue-600' : 'bg-gray-200'}`}>
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
