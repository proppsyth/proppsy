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

function revalidateFaqPaths() {
  revalidatePath('/admin/faq')
  revalidatePath('/faq')
}

export async function createFaq(data: {
  question: string
  answer: string
  category: string
  sort_order: number
  is_published: boolean
}): Promise<{ error?: string }> {
  try {
    const { supabase } = await assertAdmin()
    const { error } = await supabase.from('faq').insert({
      question:     data.question,
      answer:       data.answer,
      category:     data.category,
      sort_order:   data.sort_order,
      is_published: data.is_published,
    })
    if (error) return { error: error.message }
    revalidateFaqPaths()
    return {}
  } catch {
    return { error: 'ไม่มีสิทธิ์' }
  }
}

export async function updateFaq(id: string, data: {
  question?: string
  answer?: string
  category?: string
  sort_order?: number
  is_published?: boolean
}): Promise<{ error?: string }> {
  try {
    const { supabase } = await assertAdmin()
    const { error } = await supabase.from('faq').update(data).eq('id', id)
    if (error) return { error: error.message }
    revalidateFaqPaths()
    return {}
  } catch {
    return { error: 'ไม่มีสิทธิ์' }
  }
}

export async function deleteFaq(id: string): Promise<{ error?: string }> {
  try {
    const { supabase } = await assertAdmin()
    const { error } = await supabase.from('faq').delete().eq('id', id)
    if (error) return { error: error.message }
    revalidateFaqPaths()
    return {}
  } catch {
    return { error: 'ไม่มีสิทธิ์' }
  }
}

export async function toggleFaqPublished(
  id: string,
  currentValue: boolean
): Promise<{ error?: string }> {
  try {
    const { supabase } = await assertAdmin()
    const { error } = await supabase.from('faq').update({ is_published: !currentValue }).eq('id', id)
    if (error) return { error: error.message }
    revalidateFaqPaths()
    return {}
  } catch {
    return { error: 'ไม่มีสิทธิ์' }
  }
}
