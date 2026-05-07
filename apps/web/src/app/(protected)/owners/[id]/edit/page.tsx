import { notFound, redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import type { Owner } from '@/types'
import OwnerForm from '../../OwnerForm'

export const metadata: Metadata = { title: 'แก้ไขเจ้าของทรัพย์' }

export default async function EditOwnerPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: owner } = await supabase
    .from('owners')
    .select('*')
    .eq('id', id)
    .eq('agent_uid', user.id)
    .single()

  if (!owner) notFound()

  return (
    <div className="p-4 lg:p-8 pt-6 max-w-3xl">
      <h1 className="text-xl font-bold text-gray-900 mb-6">แก้ไขเจ้าของทรัพย์</h1>
      <OwnerForm ownerId={id} initialData={owner as unknown as Owner} />
    </div>
  )
}
