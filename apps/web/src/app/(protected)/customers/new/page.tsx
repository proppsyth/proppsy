import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import CustomerForm from '../CustomerForm'

export const metadata: Metadata = { title: 'เพิ่มลูกค้า' }

export default async function NewCustomerPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="p-4 lg:p-8 pt-6 max-w-3xl">
      <h1 className="text-xl font-bold text-gray-900 mb-6">เพิ่มลูกค้าใหม่</h1>
      <CustomerForm />
    </div>
  )
}
