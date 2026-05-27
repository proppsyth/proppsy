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

  const { data: stock } = await supabase
    .from('stock')
    .select('*, owner:owners(id, nickname, first_name_th, last_name_th)')
    .eq('id', id)
    .eq('agent_uid', user.id)
    .single()

  if (!stock) notFound()

  // Derive owner display label from joined data
  const o = (stock as Record<string, unknown>).owner as {
    id?: string; nickname?: string | null; first_name_th?: string | null; last_name_th?: string | null
  } | null | undefined
  const initialOwnerLabel = o
    ? (o.nickname || [o.first_name_th, o.last_name_th].filter(Boolean).join(' ') || '')
    : ''

  return (
    <div className="p-4 lg:p-8 pt-6 max-w-3xl">
      <h1 className="text-xl font-bold text-gray-900 mb-6">แก้ไขทรัพย์</h1>
      <StockForm
        stockId={id}
        initialData={stock as unknown as Stock}
        initialOwnerLabel={initialOwnerLabel}
      />
    </div>
  )
}
