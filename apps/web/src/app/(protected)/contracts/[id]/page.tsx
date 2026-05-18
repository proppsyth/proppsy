import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft, FileText, Eye, GitBranch, Plus } from 'lucide-react'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { DOC_TYPE_LABELS, ownerDisplayName, customerDisplayName, stockDisplayTitle } from '@/types'
import type { ContractDocType, ContractStatus, Stock, Owner, Customer, ContractSigner } from '@/types'
import ContractActions from './ContractActions'
import FurnitureChecklist from './FurnitureChecklist'
import SignersPanel from './SignersPanel'
import { TEMPLATE_SUPPORTED_TYPES } from '@/lib/contracts/templateRegistry'

export const metadata: Metadata = { title: 'รายละเอียดสัญญา' }

const STATUS_COLORS: Record<ContractStatus, string> = {
  draft:            'bg-gray-100 text-gray-600',
  sent:             'bg-yellow-100 text-yellow-700',
  viewed:           'bg-blue-100 text-blue-700',
  partially_signed: 'bg-orange-100 text-orange-700',
  signed:           'bg-green-100 text-green-700',
  completed:        'bg-emerald-100 text-emerald-700',
  cancelled:        'bg-red-100 text-red-600',
  terminated:       'bg-rose-100 text-rose-700',
  renewed:          'bg-purple-100 text-purple-700',
}

const STATUS_LABELS_TH: Record<ContractStatus, string> = {
  draft:            'ร่าง',
  sent:             'ส่งแล้ว',
  viewed:           'เปิดดูแล้ว',
  partially_signed: 'ลงนามบางส่วน',
  signed:           'ลงนามครบแล้ว',
  completed:        'เสร็จสมบูรณ์',
  cancelled:        'ยกเลิก',
  terminated:       'บอกเลิกแล้ว',
  renewed:          'ต่อสัญญาแล้ว',
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

  const [{ data: contract }, { data: furnitureItems }, { data: signers }, { data: relatedDocs }] = await Promise.all([
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

          {/* ── Reservation: Create Lease CTA ── */}
          {isReservation && isActive && (
            <Section title="ขั้นตอนถัดไป">
              <div className="flex items-start gap-2 mb-3 p-3 bg-amber-50 rounded-lg text-xs text-amber-700">
                <GitBranch className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                <span>เมื่อลูกค้าพร้อมทำสัญญาเช่า กดสร้างสัญญาเช่าจากใบจองนี้ได้เลย ข้อมูลจะถูกดึงมาให้อัตโนมัติ</span>
              </div>
              <Link
                href={`/contracts/new?from_reservation=${contract.id}`}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition w-full"
              >
                <Plus className="w-4 h-4" />
                สร้างสัญญาเช่าจากใบจองนี้
              </Link>
            </Section>
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

          {/* ── Quick Actions: create child documents (LEASE only) ── */}
          {isMasterLease && isActive && !isFinalized && (
            <Section title="สร้างเอกสารที่เกี่ยวข้อง">
              <div className="flex items-start gap-2 mb-3 p-3 bg-blue-50 rounded-lg text-xs text-blue-700">
                <GitBranch className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                <span>เอกสารด้านล่างจะอ้างอิงสัญญานี้เป็นต้นทาง และดึงข้อมูลทรัพย์ / เจ้าของ / ผู้เช่า ให้อัตโนมัติ</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { type: 'renewal',     label: 'สร้างสัญญาต่อ',   color: 'text-purple-700 border-purple-200 hover:bg-purple-50' },
                  { type: 'termination', label: 'หนังสือบอกเลิก',  color: 'text-rose-700 border-rose-200 hover:bg-rose-50' },
                  { type: 'cancellation',label: 'หนังสือยกเลิก',   color: 'text-orange-700 border-orange-200 hover:bg-orange-50' },
                  { type: 'end_contract',label: 'สิ้นสุดสัญญา',    color: 'text-red-700 border-red-200 hover:bg-red-50' },
                  { type: 'notice',      label: 'หนังสือแจ้ง',     color: 'text-gray-700 border-gray-200 hover:bg-gray-50' },
                  { type: 'warning',     label: 'หนังสือเตือน',    color: 'text-yellow-700 border-yellow-200 hover:bg-yellow-50' },
                ].map(({ type, label, color }) => (
                  <Link
                    key={type}
                    href={`/contracts/new?parent=${contract.id}&type=${type}`}
                    className={`flex items-center gap-1.5 px-3 py-2.5 rounded-lg border text-xs font-medium transition ${color}`}
                  >
                    <Plus className="w-3.5 h-3.5 flex-shrink-0" />
                    {label}
                  </Link>
                ))}
              </div>
            </Section>
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
            pdfUrl={contract.pdf_url}
            docxUrl={contract.docx_url ?? null}
            finalizedDocxUrl={(contract as { finalized_docx_url?: string }).finalized_docx_url ?? null}
            finalizedPdfUrl={(contract as { finalized_pdf_url?: string }).finalized_pdf_url ?? null}
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
