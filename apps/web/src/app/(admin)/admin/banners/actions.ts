'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

async function assertAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') throw new Error('Forbidden')
  return { supabase, user }
}

function revalidateBannerPaths() {
  revalidatePath('/admin/banners')
  revalidatePath('/')
  revalidatePath('/listing')
}

export async function createBanner(data: {
  title: string
  image_url?: string
  link_url?: string
  position: string
  is_active: boolean
  start_date?: string
  end_date?: string
  sort_order: number
  subtitle?: string
  tag?: string
  text_align?: string
  gradient?: string
  show_search?: boolean
}): Promise<{ error?: string }> {
  try {
    const { supabase } = await assertAdmin()
    const { error } = await supabase.from('banners').insert({
      title:       data.title,
      image_url:   data.image_url || null,
      link_url:    data.link_url || null,
      position:    data.position,
      is_active:   data.is_active,
      start_date:  data.start_date || null,
      end_date:    data.end_date || null,
      sort_order:  data.sort_order,
      subtitle:    data.subtitle || null,
      tag:         data.tag || null,
      text_align:  data.text_align || 'center',
      gradient:    data.gradient || null,
      show_search: data.show_search ?? true,
    })
    if (error) return { error: error.message }
    revalidateBannerPaths()
    return {}
  } catch {
    return { error: 'ไม่มีสิทธิ์' }
  }
}

export async function updateBanner(id: string, data: {
  title?: string
  image_url?: string | null
  link_url?: string | null
  position?: string
  is_active?: boolean
  start_date?: string | null
  end_date?: string | null
  sort_order?: number
  subtitle?: string | null
  tag?: string | null
  text_align?: string
  gradient?: string | null
  show_search?: boolean
}): Promise<{ error?: string }> {
  try {
    const { supabase } = await assertAdmin()
    const { error } = await supabase.from('banners').update(data).eq('id', id)
    if (error) return { error: error.message }
    revalidateBannerPaths()
    return {}
  } catch {
    return { error: 'ไม่มีสิทธิ์' }
  }
}

export async function deleteBanner(id: string): Promise<{ error?: string }> {
  try {
    const { supabase } = await assertAdmin()
    const { error } = await supabase.from('banners').delete().eq('id', id)
    if (error) return { error: error.message }
    revalidateBannerPaths()
    return {}
  } catch {
    return { error: 'ไม่มีสิทธิ์' }
  }
}

export async function toggleBannerActive(
  id: string,
  currentValue: boolean
): Promise<{ error?: string }> {
  try {
    const { supabase } = await assertAdmin()
    const { error } = await supabase.from('banners').update({ is_active: !currentValue }).eq('id', id)
    if (error) return { error: error.message }
    revalidateBannerPaths()
    return {}
  } catch {
    return { error: 'ไม่มีสิทธิ์' }
  }
}
