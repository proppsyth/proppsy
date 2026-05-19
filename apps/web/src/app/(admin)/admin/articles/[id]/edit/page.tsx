import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import EditArticleForm from './EditArticleForm'

export default async function EditArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/dashboard')

  const { data: article } = await supabase.from('articles').select('*').eq('id', id).single()
  if (!article) notFound()

  return <EditArticleForm article={article} />
}
