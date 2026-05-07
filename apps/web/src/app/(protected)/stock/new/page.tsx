import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import StockForm from '../StockForm'

export const metadata: Metadata = { title: 'เพิ่มทรัพย์ใหม่' }

export default async function NewStockPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: owners }, { data: projects }] = await Promise.all([
    supabase
      .from('owners')
      .select('id, nickname, first_name_th, last_name_th, phone')
      .eq('agent_uid', user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('projects')
      .select('id, name_th, name_en')
      .order('name_th'),
  ])

  return (
    <div className="p-4 lg:p-8 pt-6 max-w-3xl">
      <h1 className="text-xl font-bold text-gray-900 mb-6">เพิ่มทรัพย์ใหม่</h1>
      <StockForm
        owners={owners ?? []}
        projects={projects ?? []}
      />
    </div>
  )
}
