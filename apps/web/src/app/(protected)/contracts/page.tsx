import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Plus, FileText } from 'lucide-react'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { DOC_TYPE_LABELS } from '@/types'
import type { ContractDocType, ContractStatus, ContractCategory } from '@/types'

export const metadata: Metadata = { title: 'สัญญา' }

const STATUS_COLORS: Record<ContractStatus, string> = {
  draft:             'bg-gray-100 text-gray-600',
  sent:              'bg-yellow-100 text-yellow-700',
  sent_for_sign:     'bg-yellow-100 text-yellow-700',
  viewed:            'bg-blue-100 text-blue-700',
  partially_signed:  'bg-orange-100 text-orange-700',
  signed:            'bg-green-100 text-green-700',
  finalized:         'bg-emerald-100 text-emerald-700',
  active:            'bg-emerald-100 text-emerald-700',
  completed:         'bg-emerald-100 text-emerald-700',
  cancelled:         'bg-red-100 text-red-600',
  terminated:        'bg-rose-100 text-rose-700',
  renewed:           'bg-purple-100 text-purple-700',
  converted_to_lease:'bg-blue-100 text-blue-700',
}

const STATUS_LABELS_TH: Record<ContractStatus, string> = {
  draft:             'ร่าง',
  sent:              'ส่งแล้ว',
  sent_for_sign:     'ส่งเซ็นแล้ว',
  viewed:            'เปิดดูแล้ว',
  partially_signed:  'ลงนามบางส่วน',
  signed:            'ลงนามครบแล้ว',
  finalized:         'ล็อกแล้ว',
  active:            'มีผลแล้ว',
  completed:         'เสร็จสมบูรณ์',
  cancelled:         'ยกเลิก',
  terminated:        'บอกเลิกแล้ว',
  renewed:           'ต่อสัญญาแล้ว',
  converted_to_lease:'แปลงเป็นสัญญาเช่า',
}

const STATUS_TABS: { value: string; label: string }[] = [
  { value: 'all',       label: 'ทั้งหมด' },
  { value: 'draft',     label: 'ร่าง' },
  { value: 'sent',      label: 'ส่งแล้ว' },
  { value: 'signed',    label: 'ลงนาม' },
  { value: 'cancelled', label: 'ยกเลิก' },
]

const CATEGORY_TABS: { value: string; label: string }[] = [
  { value: 'all',         label: 'ทุกประเภท' },
  { value: 'reservation', label: 'ใบจอง' },
  { value: 'lease',       label: 'สัญญาเช่า' },
  { value: 'child',       label: 'เอกสารอ้างอิง' },
]

function buildHref({ status, category }: { status: string; category: string }): string {
  const p = new URLSearchParams()
  if (status !== 'all') p.set('status', status)
  if (category !== 'all') p.set('category', category)
  const qs = p.toString()
  return qs ? `/contracts?${qs}` : '/contracts'
}

export default async function ContractsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; category?: string }>
}) {
  const { status = 'all', category = 'all' } = await searchParams

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  let query = supabase
    .from('contracts')
    .select(`
      id, doc_type, status, created_at, move_in_date, is_finalized, contract_category,
      stock:stock(project_name, unit_no),
      owner:owners(first_name_th, last_name_th, nickname),
      customer:customers(first_name_th, last_name_th, nickname)
    `)
    .eq('agent_uid', user.id)
    .order('created_at', { ascending: false })

  if (status !== 'all') {
    query = query.eq('status', status)
  }
  if (category !== 'all') {
    query = query.eq('contract_category', category)
  }

  const { data: contracts } = await query

  const list = contracts ?? []

  return (
    <div className="p-4 lg:p-8 pt-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900">สัญญา</h1>
          <p className="text-sm text-gray-500 mt-0.5">{list.length} รายการ</p>
        </div>
        <Link
          href="/contracts/new"
          className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition"
        >
          <Plus className="w-4 h-4" />
          สร้างสัญญา
        </Link>
      </div>

      {/* Category tabs */}
      <div className="flex gap-1 mb-3 bg-gray-100 p-1 rounded-xl overflow-x-auto">
        {CATEGORY_TABS.map(tab => {
          const href = buildHref({ status, category: tab.value })
          return (
            <Link
              key={tab.value}
              href={href}
              className={`flex-shrink-0 flex-1 text-center text-xs py-1.5 rounded-lg font-medium transition whitespace-nowrap ${
                category === tab.value
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </Link>
          )
        })}
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 mb-4 bg-gray-100 p-1 rounded-xl overflow-x-auto">
        {STATUS_TABS.map(tab => {
          const href = buildHref({ status: tab.value, category })
          return (
            <Link
              key={tab.value}
              href={href}
              className={`flex-shrink-0 flex-1 text-center text-xs py-1.5 rounded-lg font-medium transition whitespace-nowrap ${
                status === tab.value
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </Link>
          )
        })}
      </div>

      {/* List */}
      {list.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <FileText className="w-6 h-6 text-gray-400" />
          </div>
          <p className="text-gray-500 font-medium mb-1">ยังไม่มีสัญญา</p>
          <p className="text-gray-400 text-sm">กดปุ่ม "สร้างสัญญา" เพื่อเริ่มต้น</p>
        </div>
      ) : (
        <div className="space-y-2">
          {list.map(c => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const stock = c.stock as any
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const owner = c.owner as any
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const customer = c.customer as any
            const propertyLabel = stock ? [stock.project_name, stock.unit_no].filter(Boolean).join(' · ') : null
            const ownerName = owner ? (owner.nickname || [owner.first_name_th, owner.last_name_th].filter(Boolean).join(' ')) : null
            const customerName = customer ? (customer.nickname || [customer.first_name_th, customer.last_name_th].filter(Boolean).join(' ')) : null
            const parties = [ownerName, customerName].filter(Boolean).join(' / ')
            const contractCategory = (c as unknown as { contract_category?: ContractCategory }).contract_category
            const categoryColor = contractCategory === 'reservation'
              ? 'bg-amber-50 text-amber-700'
              : contractCategory === 'lease'
                ? 'bg-blue-50 text-blue-700'
                : 'bg-gray-50 text-gray-500'
            return (
              <Link
                key={c.id}
                href={`/contracts/${c.id}`}
                className="flex items-center gap-3 bg-white rounded-xl border border-gray-100 shadow-sm p-3.5 hover:shadow-md hover:border-blue-200 transition-all"
              >
                <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <FileText className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-gray-900">{c.id}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[c.status as ContractStatus] ?? 'bg-gray-100 text-gray-600'}`}>
                      {STATUS_LABELS_TH[c.status as ContractStatus] ?? c.status}
                    </span>
                    {contractCategory && (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${categoryColor}`}>
                        {contractCategory === 'reservation' ? 'ใบจอง' : contractCategory === 'lease' ? 'สัญญาเช่า' : 'อ้างอิง'}
                      </span>
                    )}
                    {(c as unknown as { is_finalized?: boolean }).is_finalized && (
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-green-100 text-green-700">ล็อก</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {DOC_TYPE_LABELS[c.doc_type as ContractDocType] ?? c.doc_type}
                    {propertyLabel && <span className="text-gray-400"> · {propertyLabel}</span>}
                  </p>
                  {parties && (
                    <p className="text-xs text-gray-400 mt-0.5 truncate">{parties}</p>
                  )}
                </div>
                <p className="text-xs text-gray-400 flex-shrink-0 ml-2">
                  {new Date(c.created_at).toLocaleDateString('th-TH', { month: 'short', day: 'numeric' })}
                </p>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
