import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import EditBannerForm from './EditBannerForm'

export default async function EditBannerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/dashboard')

  const { data: banner } = await supabase.from('banners').select('*').eq('id', id).single()
  if (!banner) notFound()

  return <EditBannerForm banner={banner} />
}
