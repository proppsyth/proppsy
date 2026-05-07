import { notFound, redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import type { Customer } from '@/types'
import CustomerForm from '../../CustomerForm'

export const metadata: Metadata = { title: 'แก้ไขลูกค้า' }

export default async function EditCustomerPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: customer } = await supabase
    .from('customers')
    .select('*')
    .eq('id', id)
    .eq('agent_uid', user.id)
    .single()

  if (!customer) notFound()

  return (
    <div className="p-4 lg:p-8 pt-6 max-w-3xl">
      <h1 className="text-xl font-bold text-gray-900 mb-6">แก้ไขข้อมูลลูกค้า</h1>
      <CustomerForm customerId={id} initialData={customer as unknown as Customer} />
    </div>
  )
}
