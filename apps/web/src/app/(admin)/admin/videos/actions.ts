'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

async function assertAdmin(): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') throw new Error('Forbidden')
}

function revalidate() {
  revalidatePath('/admin/videos')
  revalidatePath('/')
  revalidatePath('/videos')
}

export async function createVideo(data: {
  title: string
  title_en?: string
  youtube_url: string
  description?: string
  sort_order: number
  featured: boolean
  is_active: boolean
}): Promise<{ error?: string }> {
  try {
    await assertAdmin()
    const admin = createServiceClient()
    const { error } = await admin.from('website_videos').insert(data)
    if (error) return { error: error.message }
    revalidate()
    return {}
  } catch {
    return { error: 'ไม่มีสิทธิ์' }
  }
}

export async function updateVideo(
  id: string,
  data: {
    title?: string
    title_en?: string | null
    youtube_url?: string
    description?: string | null
    sort_order?: number
    featured?: boolean
    is_active?: boolean
  }
): Promise<{ error?: string }> {
  try {
    await assertAdmin()
    const admin = createServiceClient()
    const { error } = await admin.from('website_videos').update(data).eq('id', id)
    if (error) return { error: error.message }
    revalidate()
    return {}
  } catch {
    return { error: 'ไม่มีสิทธิ์' }
  }
}

export async function toggleVideoActive(id: string, current: boolean): Promise<{ error?: string }> {
  try {
    await assertAdmin()
    const admin = createServiceClient()
    const { error } = await admin.from('website_videos').update({ is_active: !current }).eq('id', id)
    if (error) return { error: error.message }
    revalidate()
    return {}
  } catch {
    return { error: 'ไม่มีสิทธิ์' }
  }
}

export async function toggleVideoFeatured(id: string, current: boolean): Promise<{ error?: string }> {
  try {
    await assertAdmin()
    const admin = createServiceClient()
    const { error } = await admin.from('website_videos').update({ featured: !current }).eq('id', id)
    if (error) return { error: error.message }
    revalidate()
    return {}
  } catch {
    return { error: 'ไม่มีสิทธิ์' }
  }
}

export async function deleteVideo(id: string): Promise<{ error?: string }> {
  try {
    await assertAdmin()
    const admin = createServiceClient()
    const { error } = await admin.from('website_videos').delete().eq('id', id)
    if (error) return { error: error.message }
    revalidate()
    return {}
  } catch {
    return { error: 'ไม่มีสิทธิ์' }
  }
}
