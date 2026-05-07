import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Plus } from 'lucide-react'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import type { Customer } from '@/types'
import CustomerList from './CustomerList'

export const metadata: Metadata = { title: 'ลูกค้า' }

export default async function CustomersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: customers } = await supabase
    .from('customers')
    .select('*')
    .eq('agent_uid', user.id)
    .order('created_at', { ascending: false })

  return (
    <div className="p-4 lg:p-8 pt-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
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
      <CustomerList customers={(customers ?? []) as unknown as Customer[]} />
    </div>
  )
}
