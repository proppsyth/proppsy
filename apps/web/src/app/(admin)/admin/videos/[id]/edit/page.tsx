import { notFound, redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import EditVideoForm from './EditVideoForm'

export const metadata: Metadata = { title: 'แก้ไขวิดีโอ — Admin' }

export default async function EditVideoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: video } = await supabase
    .from('website_videos')
    .select('*')
    .eq('id', id)
    .single()

  if (!video) notFound()

  return <EditVideoForm video={video} />
}
