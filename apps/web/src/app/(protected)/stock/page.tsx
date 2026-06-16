import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Plus } from 'lucide-react'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import type { Stock } from '@/types'
import StockList from './StockList'

export const metadata: Metadata = { title: 'ทรัพย์ของฉัน' }

const STATUS_TABS = [
  { key: '', label: 'ทั้งหมด' },
  { key: 'available', label: 'ว่าง' },
  { key: 'reserved', label: 'จอง' },
  { key: 'pending_move_in', label: 'รอเข้าอยู่' },
  { key: 'rented', label: 'เช่าแล้ว' },
  { key: 'sold', label: 'ขายแล้ว' },
  { key: 'unavailable', label: 'ไม่ว่าง' },
]

const VALID_STATUSES = ['available', 'reserved', 'pending_move_in', 'rented', 'sold', 'unavailable']

export default async function StockPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { status = '' } = await searchParams
  const activeStatus = VALID_STATUSES.includes(status) ? status : ''

  let query = supabase
    .from('stock')
    .select('*, owner:owners(id, nickname, first_name_th, last_name_th, phone), project:projects(id, name_th, name_en)')
    .eq('agent_uid', user.id)
    .order('created_at', { ascending: false })

  if (activeStatus) {
    query = query.eq('status', activeStatus)
  }

  const [{ data: stocks }, { count: total }, { count: available }] = await Promise.all([
    query,
    supabase.from('stock').select('*', { count: 'exact', head: true }).eq('agent_uid', user.id),
    supabase.from('stock').select('*', { count: 'exact', head: true }).eq('agent_uid', user.id).eq('status', 'available'),
  ])

  return (
    <div className="p-4 lg:p-8 pt-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">ทรัพย์ของฉัน</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            ทั้งหมด {total ?? 0} รายการ · ว่าง {available ?? 0} รายการ
          </p>
        </div>
        <Link
          href="/stock/new"
          className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition flex-shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">เพิ่มทรัพย์</span>
          <span className="sm:hidden">เพิ่ม</span>
        </Link>
      </div>

      {/* Status tabs */}
      <div className="flex gap-1.5 mb-5 flex-wrap">
        {STATUS_TABS.map(t => (
          <Link
            key={t.key}
            href={t.key ? `/stock?status=${t.key}` : '/stock'}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
              activeStatus === t.key
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      <StockList stocks={(stocks ?? []) as unknown as Stock[]} />
    </div>
  )
}
