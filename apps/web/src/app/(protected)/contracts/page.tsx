import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Plus, FileText } from 'lucide-react'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { DOC_TYPE_LABELS } from '@/types'
import type { ContractDocType, ContractStatus } from '@/types'

export const metadata: Metadata = { title: 'สัญญา' }

const STATUS_COLORS: Record<ContractStatus, string> = {
  draft:            'bg-gray-100 text-gray-600',
  sent:             'bg-yellow-100 text-yellow-700',
  viewed:           'bg-blue-100 text-blue-700',
  partially_signed: 'bg-orange-100 text-orange-700',
  signed:           'bg-green-100 text-green-700',
  completed:        'bg-emerald-100 text-emerald-700',
  cancelled:        'bg-red-100 text-red-600',
}

const STATUS_LABELS_TH: Record<ContractStatus, string> = {
  draft:            'ร่าง',
  sent:             'ส่งแล้ว',
  viewed:           'เปิดดูแล้ว',
  partially_signed: 'ลงนามบางส่วน',
  signed:           'ลงนามครบแล้ว',
  completed:        'เสร็จสมบูรณ์',
  cancelled:        'ยกเลิก',
}

const TABS: { value: string; label: string }[] = [
  { value: 'all',    label: 'ทั้งหมด' },
  { value: 'draft',  label: 'ร่าง' },
  { value: 'sent',   label: 'ส่งแล้ว' },
  { value: 'signed', label: 'ลงนาม' },
  { value: 'cancelled', label: 'ยกเลิก' },
]

export default async function ContractsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const { status = 'all' } = await searchParams

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  let query = supabase
    .from('contracts')
    .select('id, doc_type, status, created_at, stock_id, owner_id, customer_id')
    .eq('agent_uid', user.id)
    .order('created_at', { ascending: false })

  if (status !== 'all') {
    query = query.eq('status', status)
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

      {/* Status tabs */}
      <div className="flex gap-1 mb-4 bg-gray-100 p-1 rounded-xl">
        {TABS.map(tab => (
          <Link
            key={tab.value}
            href={tab.value === 'all' ? '/contracts' : `/contracts?status=${tab.value}`}
            className={`flex-1 text-center text-xs py-1.5 rounded-lg font-medium transition ${
              status === tab.value || (tab.value === 'all' && status === 'all')
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </Link>
        ))}
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
          {list.map(c => (
            <Link
              key={c.id}
              href={`/contracts/${c.id}`}
              className="flex items-center gap-3 bg-white rounded-xl border border-gray-100 shadow-sm p-3.5 hover:shadow-md hover:border-blue-200 transition-all"
            >
              <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                <FileText className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-gray-900">{c.id}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[c.status as ContractStatus] ?? 'bg-gray-100 text-gray-600'}`}>
                    {STATUS_LABELS_TH[c.status as ContractStatus] ?? c.status}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  {DOC_TYPE_LABELS[c.doc_type as ContractDocType] ?? c.doc_type}
                </p>
              </div>
              <p className="text-xs text-gray-400 flex-shrink-0">
                {new Date(c.created_at).toLocaleDateString('th-TH', { month: 'short', day: 'numeric' })}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
