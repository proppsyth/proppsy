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

export async function createNews(data: {
  title: string
  summary?: string
  content?: string
  published: boolean
}): Promise<{ error?: string }> {
  try {
    const { supabase, user } = await assertAdmin()
    const { error } = await supabase.from('news').insert({
      title: data.title,
      summary: data.summary || null,
      content: data.content || null,
      published: data.published,
      created_by: user.id,
    })
    if (error) return { error: error.message }
    revalidatePath('/admin/news')
    revalidatePath('/')
    revalidatePath('/news')
    return {}
  } catch {
    return { error: 'ไม่มีสิทธิ์' }
  }
}

export async function updateNews(id: string, data: {
  title?: string
  summary?: string
  content?: string
  published?: boolean
}): Promise<{ error?: string }> {
  try {
    const { supabase } = await assertAdmin()
    const { error } = await supabase.from('news').update(data).eq('id', id)
    if (error) return { error: error.message }
    revalidatePath('/admin/news')
    revalidatePath('/')
    revalidatePath('/news')
    return {}
  } catch {
    return { error: 'ไม่มีสิทธิ์' }
  }
}

export async function deleteNews(id: string): Promise<{ error?: string }> {
  try {
    const { supabase } = await assertAdmin()
    const { error } = await supabase.from('news').delete().eq('id', id)
    if (error) return { error: error.message }
    revalidatePath('/admin/news')
    revalidatePath('/')
    revalidatePath('/news')
    return {}
  } catch {
    return { error: 'ไม่มีสิทธิ์' }
  }
}
