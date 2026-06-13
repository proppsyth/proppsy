import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Plus } from 'lucide-react'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import ContractList from './ContractList'
import PendingApprovalBanner from '@/components/shared/PendingApprovalBanner'

export const metadata: Metadata = { title: 'สัญญา' }

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
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (status !== 'all') query = query.eq('status', status)
  if (category !== 'all') query = query.eq('contract_category', category)

  const [{ data: contracts }, { data: agentProfile }] = await Promise.all([
    query,
    supabase.from('profiles').select('account_status').eq('id', user.id).single(),
  ])
  const list = contracts ?? []

  return (
    <div className="p-4 lg:p-8 pt-6">
      {agentProfile?.account_status === 'pending' && (
        <PendingApprovalBanner message="บัญชีของคุณยังอยู่ระหว่างรอการอนุมัติ — ยังไม่สามารถออกเอกสารสัญญาได้" />
      )}

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
        {CATEGORY_TABS.map(tab => (
          <Link
            key={tab.value}
            href={buildHref({ status, category: tab.value })}
            className={`flex-shrink-0 flex-1 text-center text-xs py-1.5 rounded-lg font-medium transition whitespace-nowrap ${
              category === tab.value
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 mb-4 bg-gray-100 p-1 rounded-xl overflow-x-auto">
        {STATUS_TABS.map(tab => (
          <Link
            key={tab.value}
            href={buildHref({ status: tab.value, category })}
            className={`flex-shrink-0 flex-1 text-center text-xs py-1.5 rounded-lg font-medium transition whitespace-nowrap ${
              status === tab.value
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <ContractList contracts={list as any} />
    </div>
  )
}
