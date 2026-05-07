import { notFound, redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import type { Stock } from '@/types'
import StockForm from '../../StockForm'

export const metadata: Metadata = { title: 'แก้ไขทรัพย์' }

export default async function EditStockPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: stock }, { data: owners }, { data: projects }] = await Promise.all([
    supabase
      .from('stock')
      .select('*')
      .eq('id', id)
      .eq('agent_uid', user.id)
      .single(),
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

  if (!stock) notFound()

  return (
    <div className="p-4 lg:p-8 pt-6 max-w-3xl">
      <h1 className="text-xl font-bold text-gray-900 mb-6">แก้ไขทรัพย์</h1>
      <StockForm
        stockId={id}
        initialData={stock as unknown as Stock}
        owners={owners ?? []}
        projects={projects ?? []}
      />
    </div>
  )
}
