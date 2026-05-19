import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import EditFaqForm from './EditFaqForm'

export default async function EditFaqPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/dashboard')

  const { data: faq } = await supabase.from('faq').select('*').eq('id', id).single()
  if (!faq) notFound()

  return <EditFaqForm faq={faq} />
}
