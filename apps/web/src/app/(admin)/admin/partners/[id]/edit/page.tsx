import { notFound, redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import EditPartnerForm from './EditPartnerForm'

export const metadata: Metadata = { title: 'แก้ไขพาร์ทเนอร์ — Admin' }

export default async function EditPartnerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: partner } = await supabase
    .from('partners')
    .select('*')
    .eq('id', id)
    .single()

  if (!partner) notFound()

  return <EditPartnerForm partner={partner} />
}
