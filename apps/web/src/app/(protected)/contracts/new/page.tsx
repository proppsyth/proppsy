import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import ContractWizard from '../ContractWizard'

export const metadata: Metadata = { title: 'สร้างสัญญาใหม่' }

export default async function NewContractPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: stocks }, { data: owners }, { data: customers }] = await Promise.all([
    supabase
      .from('stock')
      .select('id, project_name, unit_no, room_type, status, owner_id, rent_price, sale_price')
      .eq('agent_uid', user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('owners')
      .select('id, nickname, first_name_th, last_name_th, phone')
      .eq('agent_uid', user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('customers')
      .select('id, nickname, first_name_th, last_name_th, phone')
      .eq('agent_uid', user.id)
      .order('created_at', { ascending: false }),
  ])

  return (
    <div className="p-4 lg:p-8 pt-6 max-w-3xl">
      <h1 className="text-xl font-bold text-gray-900 mb-6">สร้างสัญญาใหม่</h1>
      <ContractWizard
        stocks={stocks ?? []}
        owners={owners ?? []}
        customers={customers ?? []}
      />
    </div>
  )
}
