import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft, FileText, Eye } from 'lucide-react'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { DOC_TYPE_LABELS, ownerDisplayName, customerDisplayName, stockDisplayTitle } from '@/types'
import type { ContractDocType, ContractStatus, Stock, Owner, Customer } from '@/types'
import ContractActions from './ContractActions'
import FurnitureChecklist from './FurnitureChecklist'
import { TEMPLATE_SUPPORTED_TYPES } from '@/lib/contracts/templateRegistry'

export const metadata: Metadata = { title: 'รายละเอียดสัญญา' }

const STATUS_COLORS: Record<ContractStatus, string> = {
  draft: 'bg-gray-100 text-gray-600',
  sent: 'bg-yellow-100 text-yellow-700',
  signed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-600',
}

const STATUS_LABELS_TH: Record<ContractStatus, string> = {
  draft: 'ร่าง',
  sent: 'ส่งแล้ว',
  signed: 'ลงนามแล้ว',
  cancelled: 'ยกเลิก',
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

  const [{ data: contract }, { data: furnitureItems }] = await Promise.all([
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
  ])

  if (!contract) notFound()

  const stock    = contract.stock as unknown as Stock | null
  const owner    = contract.owner as unknown as Owner | null
  const customer = contract.customer as unknown as Customer | null

  const docDate         = fmtDate(contract.created_at)
  const isRental        = contract.doc_type === 'rental'
  const isReceipt       = contract.doc_type === 'receipt_rent' || contract.doc_type === 'receipt_book'
  const isCommission    = contract.doc_type === 'commission'
  const isReservation   = contract.doc_type === 'reservation'
  const hasTemplate     = TEMPLATE_SUPPORTED_TYPES.has(contract.doc_type)

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
                <span className="text-xs text-gray-400">{docDate}</span>
                {contract.language_version && (
                  <span className="text-xs px-2 py-0.5 bg-purple-50 text-purple-600 rounded-full">
                    {contract.language_version === 'th' ? 'ไทย' : contract.language_version === 'th_en' ? 'ไทย+EN' : 'ไทย+EN+จีน'}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Preview link — full width on mobile */}
          {hasTemplate && (
            <Link
              href={`/contracts/${id}/preview`}
              className="flex items-center justify-center gap-1.5 px-4 py-2 border border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100 text-sm font-medium rounded-lg transition w-full sm:w-auto sm:self-start"
            >
              <Eye className="w-3.5 h-3.5" />
              Preview เอกสาร
            </Link>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Left: main info */}
        <div className="lg:col-span-2 space-y-4 min-w-0">
          {/* ทรัพย์ */}
          {stock && (
            <Section title="ทรัพย์สิน">
              <div className="flex items-start gap-2 justify-between min-w-0">
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
            </Section>
          )}

          {/* รายละเอียดการเงิน */}
          {(isRental || isReservation || isReceipt || isCommission) && (
            <Section title="รายละเอียดทางการเงิน">
              <div className="space-y-2">
                {contract.rent_price != null && (
                  <FinRow label={isReceipt ? 'จำนวนเงิน' : 'ค่าเช่า / เดือน'} value={`฿${fmt(contract.rent_price)}`} />
                )}
                {contract.deposit_amount != null && (
                  <FinRow
                    label={`เงินมัดจำ${contract.deposit_months ? ` (${contract.deposit_months} เดือน)` : ''}`}
                    value={`฿${fmt(contract.deposit_amount)}`}
                  />
                )}
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

          {/* Furniture checklist — rental only */}
          {isRental && (
            <Section title="รายการเฟอร์นิเจอร์และอุปกรณ์">
              <FurnitureChecklist
                contractId={id}
                initialItems={(furnitureItems ?? []).map(item => ({
                  id: item.id,
                  item_name: item.item_name,
                  quantity: item.quantity ?? 1,
                  condition: item.condition ?? 'good',
                  notes: item.notes ?? '',
                  serial_no: item.serial_no ?? '',
                }))}
              />
            </Section>
          )}
        </div>

        {/* Right: parties + actions */}
        <div className="space-y-4 min-w-0">
          {/* เจ้าของ */}
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

          {/* ลูกค้า */}
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

          {/* Actions */}
          <ContractActions
            contractId={contract.id}
            status={contract.status as ContractStatus}
            pdfUrl={contract.pdf_url}
            docxUrl={contract.docx_url ?? null}
            templateSlug={contract.template_slug ?? null}
            signToken={contract.sign_token ?? null}
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
