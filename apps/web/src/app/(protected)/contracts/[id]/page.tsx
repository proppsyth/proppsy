import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft, FileText, Eye, GitBranch } from 'lucide-react'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { DOC_TYPE_LABELS, ownerDisplayName, customerDisplayName, stockDisplayTitle } from '@/types'
import type { ContractDocType, ContractStatus, Stock, Owner, Customer, ContractSigner } from '@/types'
import ContractActions from './ContractActions'
import ContractStockPhotos from './ContractStockPhotos'
import FurnitureChecklist from './FurnitureChecklist'
import KeyHandoverChecklist from './KeyHandoverChecklist'
import SignersPanel from './SignersPanel'
import CreateChildDocPanel from '../CreateChildDocPanel'
import CreateLeasePanel from '../CreateLeasePanel'
import EditDraftPanel from '../EditDraftPanel'
import DeleteContractButton from './DeleteContractButton'
import { TEMPLATE_SUPPORTED_TYPES } from '@/lib/contracts/templateRegistry'

const DELETABLE_STATUSES = new Set(['draft', 'cancelled', 'terminated'])

export const metadata: Metadata = { title: 'รายละเอียดสัญญา' }

const STATUS_COLORS: Record<ContractStatus, string> = {
  draft:              'bg-gray-100 text-gray-600',
  sent:               'bg-yellow-100 text-yellow-700',
  sent_for_sign:      'bg-amber-100 text-amber-700',
  viewed:             'bg-blue-100 text-blue-700',
  partially_signed:   'bg-orange-100 text-orange-700',
  signed:             'bg-green-100 text-green-700',
  finalized:          'bg-teal-100 text-teal-700',
  active:             'bg-emerald-100 text-emerald-700',
  completed:          'bg-emerald-100 text-emerald-700',
  cancelled:          'bg-red-100 text-red-600',
  terminated:         'bg-rose-100 text-rose-700',
  renewed:            'bg-purple-100 text-purple-700',
  converted_to_lease: 'bg-sky-100 text-sky-700',
}

const STATUS_LABELS_TH: Record<ContractStatus, string> = {
  draft:              'ร่าง',
  sent:               'ส่งแล้ว',
  sent_for_sign:      'รอลงนาม',
  viewed:             'เปิดดูแล้ว',
  partially_signed:   'ลงนามบางส่วน',
  signed:             'ลงนามครบแล้ว',
  finalized:          'ล็อกแล้ว',
  active:             'ใช้งาน',
  completed:          'เสร็จสมบูรณ์',
  cancelled:          'ยกเลิก',
  terminated:         'บอกเลิกแล้ว',
  renewed:            'ต่อสัญญาแล้ว',
  converted_to_lease: 'สร้างสัญญาเช่าแล้ว',
}


function fmt(n: number): string {
  return new Intl.NumberFormat('th-TH').format(n)
}

function fmtDate(d: string): string {
  return new Date(d).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })
}

export default async function ContractDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: contract }, { data: furnitureItems }, { data: keyItems }, { data: signers }, { data: relatedDocs }, { data: coAgents }] = await Promise.all([
    supabase
      .from('contracts')
      .select('*, stock:stock(*), owner:owners(*), customer:customers(*)')
      .eq('id', id)
      .eq('agent_uid', user.id)
      .single(),
    supabase
      .from('contract_furniture_items')
      .select('*')
      .eq('contract_id', id)
      .order('sort_order'),
    supabase
      .from('contract_key_items')
      .select('*')
      .eq('contract_id', id)
      .order('sort_order'),
    supabase
      .from('contract_signers')
      .select('*')
      .eq('contract_id', id)
      .order('sort_order'),
    supabase
      .from('contracts')
      .select('id, doc_type, status, created_at, end_date, effective_end_date, contract_category')
      .eq('parent_contract_id', id)
      .eq('agent_uid', user.id)
      .order('created_at', { ascending: true }),
    supabase
      .from('co_agents')
      .select('id,prefix_th,prefix_en,first_name_th,last_name_th,first_name_en,last_name_en,address_no,moo,soi,road,subdistrict,district,province,zip,bank_name,bank_account_name,bank_account_no,national_id,tax_id')
      .eq('agent_uid', user.id)
      .order('created_at', { ascending: false }),
  ])

  if (!contract) notFound()

  const stock    = contract.stock as unknown as Stock | null
  const owner    = contract.owner as unknown as Owner | null
  const customer = contract.customer as unknown as Customer | null

  const contractMeta = contract as {
    is_finalized?: boolean
    effective_end_date?: string | null
    terminated_at?: string | null
    contract_category?: string | null
    master_contract_id?: string | null
    reservation_id?: string | null
  }

  const docDate          = fmtDate(contract.created_at)
  const isRental         = contract.doc_type === 'rental'
  const isReceipt        = contract.doc_type === 'receipt_rent' || contract.doc_type === 'receipt_book'
  const isCommission     = contract.doc_type === 'commission'
  const isReservation    = contract.doc_type === 'reservation'
  const hasTemplate      = TEMPLATE_SUPPORTED_TYPES.has(contract.doc_type)
  const isFinalized      = !!contractMeta.is_finalized
  // ONLY rental (doc_type='rental') is a master lease — reservations and renewals are NOT
  const isMasterLease    = contract.doc_type === 'rental'
  const isChildDoc       = contractMeta.contract_category === 'child'
  const isActive         = !['cancelled', 'terminated', 'completed', 'renewed'].includes(contract.status)
  const effectiveEndDate = contractMeta.effective_end_date
  const masterContractId = contractMeta.master_contract_id
  const reservationId    = contractMeta.reservation_id

  return (
    <div className="w-full p-4 lg:p-8 pt-6 max-w-4xl overflow-x-hidden">
      {/* Header */}
      <div className="mb-5">
        <Link href="/contracts" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition mb-3 w-fit">
          <ArrowLeft className="w-4 h-4" />
          กลับรายการสัญญา
        </Link>
        <div className="flex flex-col gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-gray-400 truncate">{contract.id}</p>
              <h1 className="text-xl font-bold text-gray-900 break-words">
                {DOC_TYPE_LABELS[contract.doc_type as ContractDocType] ?? contract.doc_type}
              </h1>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_COLORS[contract.status as ContractStatus] ?? 'bg-gray-100 text-gray-600'}`}>
                  {STATUS_LABELS_TH[contract.status as ContractStatus] ?? contract.status}
                </span>
                {isFinalized && (
                  <span className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium bg-emerald-100 text-emerald-700">
                    <Eye className="w-3 h-3" />
                    ล็อกแล้ว
                  </span>
                )}
                <span className="text-xs text-gray-400">{docDate}</span>
                {contract.language_version && (
                  <span className="text-xs px-2 py-0.5 bg-purple-50 text-purple-600 rounded-full">
                    {contract.language_version === 'th' ? 'ไทย' : contract.language_version === 'th_en' ? 'ไทย+EN' : 'ไทย+EN+จีน'}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {hasTemplate && (
              <Link
                href={`/contracts/${id}/preview`}
                className="flex items-center justify-center gap-1.5 px-4 py-2 border border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100 text-sm font-medium rounded-lg transition"
              >
                <Eye className="w-3.5 h-3.5" />
                Preview เอกสาร
              </Link>
            )}
            {!isFinalized && DELETABLE_STATUSES.has(contract.status) && (
              <DeleteContractButton contractId={contract.id} />
            )}
          </div>
        </div>
      </div>

      {/* ── Effective end date banner (when terminated early) ── */}
      {effectiveEndDate && (
        <div className="mb-4 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 text-sm text-rose-700 flex items-center gap-2">
          <span className="font-medium">สิ้นสุดสัญญาก่อนกำหนด:</span>
          <span>มีผลวันที่ {fmtDate(effectiveEndDate)}</span>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Left: main info */}
        <div className="lg:col-span-2 space-y-4 min-w-0">
          {stock && (
            <Section title="ทรัพย์สิน">
              <div className="flex items-start gap-2 justify-between min-w-0 mb-3">
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-gray-400 truncate">{stock.id}</p>
                  <p className="font-medium text-gray-900 text-sm break-words">{stockDisplayTitle(stock)}</p>
                  <div className="flex gap-2 mt-1 text-xs text-gray-500 flex-wrap">
                    {stock.size_sqm && <span>{stock.size_sqm} ตร.ม.</span>}
                    {stock.floor && <span>· ชั้น {stock.floor}</span>}
                  </div>
                </div>
                <Link href={`/stock/${stock.id}`} className="text-xs text-blue-600 hover:underline flex-shrink-0">
                  ดูทรัพย์ →
                </Link>
              </div>
              <ContractStockPhotos
                stockId={stock.id}
                initialMainUrls={(stock.photo_urls ?? []) as string[]}
                initialThumbUrls={(stock.photo_thumb_urls ?? []) as string[]}
              />
            </Section>
          )}

          {(isRental || isReservation || isReceipt || isCommission) && (
            <Section title="รายละเอียดทางการเงิน">
              <div className="space-y-2">
                {contract.rent_price != null && (
                  <FinRow label={isReceipt ? 'จำนวนเงิน' : 'ค่าเช่า / เดือน'} value={`฿${fmt(contract.rent_price)}`} />
                )}
                {isReservation && (contract as { booking_amount?: number | null }).booking_amount != null && (
                  <FinRow
                    label="เงินจอง (Booking Amount)"
                    value={`฿${fmt((contract as { booking_amount?: number | null }).booking_amount!)}`}
                  />
                )}
                {isReservation && contract.deposit_amount != null && (
                  <FinRow
                    label={`เงินประกันสัญญา${contract.deposit_months ? ` (${contract.deposit_months} เดือน)` : ''}`}
                    value={`฿${fmt(contract.deposit_amount)}`}
                  />
                )}
                {!isReservation && contract.deposit_amount != null && (
                  <FinRow
                    label={`เงินมัดจำ/จอง${contract.deposit_months ? ` (${contract.deposit_months} เดือน)` : ''}`}
                    value={`฿${fmt(contract.deposit_amount)}`}
                  />
                )}
                {isRental && (() => {
                  const sd = (contract as { security_deposit?: number | null }).security_deposit
                  if (!sd) return null
                  const sdMonths = contract.rent_price && contract.rent_price > 0
                    ? Math.round((sd / contract.rent_price) * 10) / 10
                    : null
                  return (
                    <FinRow
                      label={`เงินประกัน${sdMonths != null ? ` (${sdMonths} เดือน)` : ''}`}
                      value={`฿${fmt(sd)}`}
                    />
                  )
                })()}
                {contract.contract_months != null && (
                  <FinRow label="ระยะสัญญา" value={`${contract.contract_months} เดือน`} />
                )}
                {contract.move_in_date && (
                  <FinRow label={isReceipt ? 'ประจำเดือน' : 'วันเข้าอยู่'} value={fmtDate(contract.move_in_date)} />
                )}
                {contract.end_date && (
                  <FinRow label="วันสิ้นสุดสัญญา" value={fmtDate(contract.end_date)} />
                )}
                {contract.cleaning_fee != null && contract.cleaning_fee > 0 && (
                  <FinRow label="ค่าทำความสะอาด" value={`฿${fmt(contract.cleaning_fee)}`} />
                )}
                {contract.ac_count != null && contract.ac_count > 0 && (
                  <FinRow
                    label="ค่าล้างแอร์"
                    value={`${contract.ac_count} เครื่อง × ฿${fmt(contract.ac_wash_per_unit ?? 0)} = ฿${fmt(contract.ac_count * (contract.ac_wash_per_unit ?? 0))}`}
                  />
                )}
                {contract.penalty_amount != null && contract.penalty_amount > 0 && (
                  <FinRow label="ค่าปรับ" value={`฿${fmt(contract.penalty_amount)}`} />
                )}
                {contract.commission_net != null && (
                  <FinRow label="ค่านายหน้า" value={`฿${fmt(contract.commission_net)}`} />
                )}
                {(contract.vat_7 || contract.wht_3) && (
                  <div className="flex gap-2 mt-1">
                    {contract.vat_7 && <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full">VAT 7%</span>}
                    {contract.wht_3 && <span className="text-xs px-2 py-0.5 bg-orange-50 text-orange-600 rounded-full">หัก ณ ที่จ่าย 3%</span>}
                  </div>
                )}
              </div>
            </Section>
          )}

          {isRental && (
            <Section title="รายการเฟอร์นิเจอร์และอุปกรณ์">
              <FurnitureChecklist
                contractId={id}
                initialItems={(furnitureItems ?? []).map(item => ({
                  id: item.id,
                  item_name: item.item_name,
                  item_name_en: (item as { item_name_en?: string | null }).item_name_en ?? '',
                  quantity: item.quantity ?? 1,
                  condition: item.condition ?? 'good',
                  notes: item.notes ?? '',
                  serial_no: item.serial_no ?? '',
                }))}
              />
            </Section>
          )}

          {isRental && (
            <Section title="กุญแจและอุปกรณ์ส่งมอบ (รับมอบเข้า)">
              <KeyHandoverChecklist
                contractId={id}
                initialItems={(keyItems ?? []).map(item => ({
                  localId:        item.id,
                  item_name_th:   (item as { item_name_th: string }).item_name_th,
                  item_name_en:   (item as { item_name_en: string }).item_name_en ?? '',
                  quantity:       (item as { quantity: number }).quantity ?? 1,
                  penalty_amount: (item as { penalty_amount: number }).penalty_amount ?? 500,
                }))}
              />
            </Section>
          )}

          {/* ── Draft: Edit Panel ── */}
          {!isFinalized && contract.status === 'draft' && (
            <EditDraftPanel
              data={{
                contractId:            id,
                contractCategory:      contractMeta.contract_category ?? null,
                docType:               contract.doc_type,
                rentPrice:             contract.rent_price ?? null,
                depositMonths:         contract.deposit_months ?? null,
                depositAmount:         contract.deposit_amount ?? null,
                bookingAmount:         (contract as { booking_amount?: number | null }).booking_amount ?? null,
                contractMonths:        contract.contract_months ?? null,
                moveInDate:            contract.move_in_date ?? null,
                endDate:               contract.end_date ?? null,
                reservationExpireDate: (contract as { reservation_expire_date?: string | null }).reservation_expire_date ?? null,
                paymentDate:           (contract as { payment_date?: string | null }).payment_date ?? null,
                penaltyAmount:         contract.penalty_amount ?? null,
                cleaningFee:           contract.cleaning_fee ?? null,
                acCount:               contract.ac_count ?? null,
                acWashPerUnit:         contract.ac_wash_per_unit ?? null,
                occupantCount:         (contract as { occupant_count?: number | null }).occupant_count ?? null,
                waterUnitPrice:        (contract as { water_unit_price?: number | null }).water_unit_price ?? null,
                electricUnitPrice:     (contract as { electric_unit_price?: number | null }).electric_unit_price ?? null,
                internetFee:           (contract as { internet_fee?: number | null }).internet_fee ?? null,
                commonFee:             (contract as { common_fee?: number | null }).common_fee ?? null,
                parkingFee:            (contract as { parking_fee?: number | null }).parking_fee ?? null,
                paymentGraceDays:      (contract as { payment_grace_days?: number | null }).payment_grace_days ?? null,
                paymentDayOfMonth:     (contract as { payment_day_of_month?: number | null }).payment_day_of_month ?? null,
                vat7:                  contract.vat_7 ?? false,
                wht3:                  contract.wht_3 ?? false,
                commissionNet:         contract.commission_net ?? null,
                commissionRatePct:     (contract as { commission_rate_pct?: number | null }).commission_rate_pct ?? null,
                commissionFromOwner:   (contract as { commission_from_owner?: number | null }).commission_from_owner ?? null,
                commissionFromCustomer: (contract as { commission_from_customer?: number | null }).commission_from_customer ?? null,
                securityDeposit:       (contractMeta as { security_deposit?: number | null }).security_deposit ?? null,
                coAgentSplitPct:       (contractMeta as { co_agent_split_pct?: number | null }).co_agent_split_pct ?? null,
                coAgentCommission:     (contractMeta as { co_agent_commission?: number | null }).co_agent_commission ?? null,
              }}
            />
          )}

          {/* ── Reservation: Invoice/Receipt docs panel ── */}
          {isReservation && isActive && (
            <CreateChildDocPanel
              leaseId={id}
              parentCategory="reservation"
              leaseData={{
                rentPrice:             contract.rent_price ?? null,
                depositAmount:         contract.deposit_amount ?? null,
                depositMonths:         contract.deposit_months ?? null,
                bookingAmount:         (contract as { booking_amount?: number | null }).booking_amount ?? null,
                securityDeposit:       (contract as { security_deposit?: number | null }).security_deposit ?? null,
                contractMonths:        contract.contract_months ?? null,
                moveInDate:            contract.move_in_date ?? null,
                endDate:               contract.end_date ?? null,
                commissionNet:         contract.commission_net ?? null,
                commissionFromOwner:   (contract as { commission_from_owner?: number | null }).commission_from_owner ?? null,
                commissionFromCustomer: (contract as { commission_from_customer?: number | null }).commission_from_customer ?? null,
                commissionRatePct:     (contract as { commission_rate_pct?: number | null }).commission_rate_pct ?? null,
                coAgentSplitPct:       (contractMeta as { co_agent_split_pct?: number | null }).co_agent_split_pct ?? null,
                coAgentCommission:     (contractMeta as { co_agent_commission?: number | null }).co_agent_commission ?? null,
                vat7:                  contract.vat_7 ?? false,
                wht3:                  contract.wht_3 ?? false,
                paymentDayOfMonth:     (contract as { payment_day_of_month?: number | null }).payment_day_of_month ?? null,
                paymentGraceDays:      (contract as { payment_grace_days?: number | null }).payment_grace_days ?? null,
              }}
            />
          )}

          {/* ── Reservation: Create Lease Panel ── */}
          {isReservation && contract.status !== 'converted_to_lease' && isActive && (
            <CreateLeasePanel
              reservation={{
                reservationId:     id,
                rentPrice:         contract.rent_price ?? null,
                depositMonths:     contract.deposit_months ?? null,
                depositAmount:     contract.deposit_amount ?? null,
                bookingAmount:     (contract as { booking_amount?: number | null }).booking_amount ?? null,
                contractMonths:    contract.contract_months ?? null,
                moveInDate:        contract.move_in_date ?? null,
                waterUnitPrice:    (contract as { water_unit_price?: number | null }).water_unit_price ?? null,
                electricUnitPrice: (contract as { electric_unit_price?: number | null }).electric_unit_price ?? null,
                internetFee:       (contract as { internet_fee?: number | null }).internet_fee ?? null,
                commonFee:         (contract as { common_fee?: number | null }).common_fee ?? null,
                parkingFee:        (contract as { parking_fee?: number | null }).parking_fee ?? null,
                cleaningFee:       contract.cleaning_fee ?? null,
                acCount:           contract.ac_count ?? null,
                acWashPerUnit:     contract.ac_wash_per_unit ?? null,
                paymentGraceDays:  (contract as { payment_grace_days?: number | null }).payment_grace_days ?? null,
                paymentDayOfMonth: (contract as { payment_day_of_month?: number | null }).payment_day_of_month ?? null,
                occupantCount:     (contract as { occupant_count?: number | null }).occupant_count ?? null,
              }}
            />
          )}

          {/* ── Lease: back-link to source reservation ── */}
          {isMasterLease && reservationId && (
            <div className="mb-2 flex items-center gap-2 text-sm text-amber-700 bg-amber-50 rounded-xl px-3 py-2.5">
              <GitBranch className="w-3.5 h-3.5 flex-shrink-0" />
              <span>สร้างจากใบจอง:</span>
              <Link href={`/contracts/${reservationId}`} className="font-semibold hover:underline">
                {reservationId}
              </Link>
            </div>
          )}

          {/* ── Child doc: back-link to master lease ── */}
          {isChildDoc && masterContractId && (
            <div className="mb-2 flex items-center gap-2 text-sm text-blue-600">
              <GitBranch className="w-3.5 h-3.5 flex-shrink-0" />
              <span>เอกสารนี้อ้างอิงสัญญาหลัก:</span>
              <Link href={`/contracts/${masterContractId}`} className="font-semibold hover:underline">
                {masterContractId}
              </Link>
            </div>
          )}

          {/* ── Child Doc Panel: all documents from this lease ── */}
          {isMasterLease && isActive && (
            <CreateChildDocPanel
              leaseId={contract.id}
              coAgents={(coAgents ?? []) as import('../CreateChildDocPanel').CoAgentProfile[]}
              leaseData={{
                rentPrice:            contract.rent_price ?? null,
                depositAmount:        contract.deposit_amount ?? null,
                depositMonths:        contract.deposit_months ?? null,
                securityDeposit:      (contract as { security_deposit?: number | null }).security_deposit ?? null,
                bookingAmount:        (contract as { booking_amount?: number | null }).booking_amount ?? null,
                contractMonths:       contract.contract_months ?? null,
                moveInDate:           contract.move_in_date ?? null,
                endDate:              contract.end_date ?? null,
                commissionNet:        contract.commission_net ?? null,
                commissionFromOwner:  (contract as { commission_from_owner?: number | null }).commission_from_owner ?? null,
                commissionFromCustomer: (contract as { commission_from_customer?: number | null }).commission_from_customer ?? null,
                commissionRatePct:    (contract as { commission_rate_pct?: number | null }).commission_rate_pct ?? null,
                coAgentSplitPct:      (contractMeta as { co_agent_split_pct?: number | null }).co_agent_split_pct ?? null,
                coAgentCommission:    (contractMeta as { co_agent_commission?: number | null }).co_agent_commission ?? null,
                vat7:                 contract.vat_7 ?? false,
                wht3:                 contract.wht_3 ?? false,
                paymentDayOfMonth:    (contract as { payment_day_of_month?: number | null }).payment_day_of_month ?? null,
                paymentGraceDays:     (contract as { payment_grace_days?: number | null }).payment_grace_days ?? null,
              }}
            />
          )}

          {/* ── Related Documents Timeline ── */}
          {(relatedDocs ?? []).length > 0 && (
            <Section title={`เอกสารที่เกี่ยวข้อง (${relatedDocs!.length})`}>
              <div className="space-y-0">
                {relatedDocs!.map((doc, i) => {
                  const isLast = i === relatedDocs!.length - 1
                  const docStatus = doc.status as ContractStatus
                  const effectiveDate = (doc as { effective_end_date?: string | null }).effective_end_date
                  return (
                    <div key={doc.id} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className="w-2 h-2 rounded-full bg-blue-400 mt-1.5 flex-shrink-0" />
                        {!isLast && <div className="w-px flex-1 bg-gray-200 my-1" />}
                      </div>
                      <div className={`pb-3 ${isLast ? '' : ''} min-w-0 flex-1`}>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link href={`/contracts/${doc.id}`} className="text-sm font-medium text-blue-600 hover:underline">
                            {doc.id}
                          </Link>
                          <span className="text-xs text-gray-500">{DOC_TYPE_LABELS[doc.doc_type as ContractDocType] ?? doc.doc_type}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[docStatus] ?? 'bg-gray-100 text-gray-600'}`}>
                            {STATUS_LABELS_TH[docStatus] ?? docStatus}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {fmtDate(doc.created_at)}
                          {effectiveDate && <span className="ml-2 text-rose-600">มีผลวันที่ {fmtDate(effectiveDate)}</span>}
                          {!effectiveDate && doc.end_date && <span className="ml-2">ถึง {fmtDate(doc.end_date)}</span>}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </Section>
          )}
        </div>

        {/* Right: parties + signers + actions */}
        <div className="space-y-4 min-w-0">
          {owner && (
            <Section title="เจ้าของทรัพย์">
              <div className="space-y-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center text-orange-700 font-semibold text-xs flex-shrink-0">
                    {ownerDisplayName(owner).charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">{ownerDisplayName(owner)}</p>
                    {owner.phone && <p className="text-xs text-gray-400">{owner.phone}</p>}
                  </div>
                </div>
                <Link href={`/owners/${owner.id}`} className="block text-xs text-blue-600 hover:underline">
                  ดูข้อมูลเจ้าของ →
                </Link>
              </div>
            </Section>
          )}

          {customer && (
            <Section title="ลูกค้า / ผู้เช่า">
              <div className="space-y-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-8 h-8 bg-violet-100 rounded-full flex items-center justify-center text-violet-700 font-semibold text-xs flex-shrink-0">
                    {customerDisplayName(customer).charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">{customerDisplayName(customer)}</p>
                    {customer.phone && <p className="text-xs text-gray-400">{customer.phone}</p>}
                  </div>
                </div>
                <Link href={`/customers/${customer.id}`} className="block text-xs text-blue-600 hover:underline">
                  ดูข้อมูลลูกค้า →
                </Link>
              </div>
            </Section>
          )}

          {/* Signers panel */}
          <SignersPanel
            contractId={id}
            initialSigners={(signers ?? []) as ContractSigner[]}
            owner={owner ? { name: ownerDisplayName(owner), phone: owner.phone ?? '' } : null}
            customer={customer ? { name: customerDisplayName(customer), phone: customer.phone ?? '' } : null}
          />

          <ContractActions
            contractId={contract.id}
            status={contract.status as ContractStatus}
            contractCategory={contractMeta.contract_category ?? null}
            docType={contract.doc_type}
            pdfUrl={contract.pdf_url}
            docxUrl={contract.docx_url ?? null}
            finalizedDocxUrl={(contract as { finalized_docx_url?: string }).finalized_docx_url ?? null}
            finalizedPdfUrl={(contract as { finalized_pdf_url?: string }).finalized_pdf_url ?? null}
            attachmentPdfUrl={(contract as { attachment_pdf_url?: string | null }).attachment_pdf_url ?? null}
            templateSlug={contract.template_slug ?? null}
            isFinalized={isFinalized}
            finalizedAt={(contract as { finalized_at?: string }).finalized_at ?? null}
          />
        </div>
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

function FinRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0 gap-3">
      <span className="text-xs text-gray-500 min-w-0 flex-1">{label}</span>
      <span className="text-sm font-semibold text-gray-900 flex-shrink-0 text-right">{value}</span>
    </div>
  )
}
