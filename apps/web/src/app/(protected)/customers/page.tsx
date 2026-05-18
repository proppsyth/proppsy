import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Plus } from 'lucide-react'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import type { Customer } from '@/types'
import CustomerList from './CustomerList'

export const metadata: Metadata = { title: 'ลูกค้า' }

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ show_archived?: string }>
}) {
  const { show_archived } = await searchParams
  const showArchived = show_archived === '1'

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: customers } = await supabase
    .from('customers')
    .select('*')
    .eq('agent_uid', user.id)
    .eq('is_archived', showArchived)
    .order('created_at', { ascending: false })

  return (
    <div className="p-4 lg:p-8 pt-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900">ลูกค้า</h1>
          <p className="text-sm text-gray-500 mt-0.5">{(customers ?? []).length} รายการ</p>
        </div>
        <Link
          href="/customers/new"
          className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition"
        >
          <Plus className="w-4 h-4" />
          เพิ่มลูกค้า
        </Link>
      </div>

      {/* Archive tabs */}
      <div className="flex gap-1 mb-4 bg-gray-100 p-1 rounded-xl w-fit">
        <Link
          href="/customers"
          className={`px-4 py-1.5 rounded-lg text-xs font-medium transition ${
            !showArchived ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          ใช้งาน
        </Link>
        <Link
          href="/customers?show_archived=1"
          className={`px-4 py-1.5 rounded-lg text-xs font-medium transition ${
            showArchived ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          เก็บถาวร
        </Link>
      </div>

      <CustomerList customers={(customers ?? []) as unknown as Customer[]} showArchived={showArchived} />
    </div>
  )
}
