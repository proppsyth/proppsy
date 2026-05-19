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

function revalidateArticlePaths() {
  revalidatePath('/admin/articles')
  revalidatePath('/')
  revalidatePath('/articles')
}

export async function createArticle(data: {
  title: string
  slug: string
  excerpt?: string
  content?: string
  cover_url?: string
  category: string
  is_published: boolean
}): Promise<{ error?: string }> {
  try {
    const { supabase, user } = await assertAdmin()

    // Validate slug format
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(data.slug)) {
      return { error: 'Slug ต้องเป็นตัวอักษรพิมพ์เล็ก ตัวเลข และขีดกลางเท่านั้น' }
    }

    // Check slug uniqueness
    const { data: existing } = await supabase
      .from('articles')
      .select('id')
      .eq('slug', data.slug)
      .maybeSingle()
    if (existing) return { error: 'Slug นี้ถูกใช้งานแล้ว กรุณาเลือก slug อื่น' }

    const { error } = await supabase.from('articles').insert({
      title:        data.title,
      slug:         data.slug,
      excerpt:      data.excerpt || null,
      content:      data.content || null,
      cover_url:    data.cover_url || null,
      category:     data.category,
      is_published: data.is_published,
      published_at: data.is_published ? new Date().toISOString() : null,
      author_uid:   user.id,
    })
    if (error) return { error: error.message }
    revalidateArticlePaths()
    return {}
  } catch {
    return { error: 'ไม่มีสิทธิ์' }
  }
}

export async function updateArticle(id: string, data: {
  title?: string
  slug?: string
  excerpt?: string | null
  content?: string | null
  cover_url?: string | null
  category?: string
  is_published?: boolean
}): Promise<{ error?: string }> {
  try {
    const { supabase } = await assertAdmin()

    if (data.slug !== undefined) {
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(data.slug)) {
        return { error: 'Slug ต้องเป็นตัวอักษรพิมพ์เล็ก ตัวเลข และขีดกลางเท่านั้น' }
      }
      const { data: existing } = await supabase
        .from('articles')
        .select('id')
        .eq('slug', data.slug)
        .neq('id', id)
        .maybeSingle()
      if (existing) return { error: 'Slug นี้ถูกใช้งานแล้ว กรุณาเลือก slug อื่น' }
    }

    const updateData: Record<string, unknown> = { ...data }
    if (data.is_published !== undefined) {
      updateData.published_at = data.is_published ? new Date().toISOString() : null
    }

    const { error } = await supabase.from('articles').update(updateData).eq('id', id)
    if (error) return { error: error.message }
    revalidateArticlePaths()
    return {}
  } catch {
    return { error: 'ไม่มีสิทธิ์' }
  }
}

export async function deleteArticle(id: string): Promise<{ error?: string }> {
  try {
    const { supabase } = await assertAdmin()
    const { error } = await supabase.from('articles').delete().eq('id', id)
    if (error) return { error: error.message }
    revalidateArticlePaths()
    return {}
  } catch {
    return { error: 'ไม่มีสิทธิ์' }
  }
}

export async function toggleArticlePublished(
  id: string,
  currentValue: boolean
): Promise<{ error?: string }> {
  try {
    const { supabase } = await assertAdmin()
    const next = !currentValue
    const { error } = await supabase.from('articles').update({
      is_published: next,
      published_at: next ? new Date().toISOString() : null,
    }).eq('id', id)
    if (error) return { error: error.message }
    revalidateArticlePaths()
    return {}
  } catch {
    return { error: 'ไม่มีสิทธิ์' }
  }
}
