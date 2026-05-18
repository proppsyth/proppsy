import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import EditNewsForm from './EditNewsForm'

export default async function EditNewsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/dashboard')

  const { data: news } = await supabase.from('news').select('*').eq('id', id).single()
  if (!news) notFound()

  return <EditNewsForm news={news} />
}
