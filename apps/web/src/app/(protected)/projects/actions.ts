'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { identifyAndEnrichProject } from '@/lib/ai/projectIdentity'

// ─── Types ───────────────────────────────────────────────────

export type ProjectInput = {
  name_th: string
  name_en?: string
  developer?: string
  built_year?: number
  total_floors?: number
  total_units?: number
  parking_pct?: number
  facilities: string[]
  bts_mrt: string[]
  address_no?: string
  moo?: string
  address_road?: string
  province?: string
  district?: string
  subdistrict?: string
  zip?: string
  map_url?: string
}

export type AiEnrichResult = {
  /** Canonical Thai name — may differ from user input if AI corrected it. */
  name_th?: string | null
  /** Canonical English name. */
  name_en?: string | null
  /** AI confidence 0–100 that it correctly identified the project. */
  confidence?: number | null
  /** Other known aliases (abbreviations, old names, romanised variants). */
  aliases?: string[] | null
  developer?: string | null
  built_year?: number | null
  total_floors?: number | null
  total_units?: number | null
  parking_pct?: number | null
  facilities?: string[]
  bts_mrt?: string[]
  address_road?: string | null
  moo?: string | null
  province?: string | null
  district?: string | null
  subdistrict?: string | null
  zip?: string | null
}

// ─── Role helper ─────────────────────────────────────────────

async function getIsAdmin(): Promise<boolean> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  return profile?.role === 'admin'
}

// ─── ID Generator ────────────────────────────────────────────

async function nextProjectId(): Promise<string> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('projects')
    .select('id')
    .like('id', 'PRJ-%')
    .order('id', { ascending: false })
    .limit(1)
    .maybeSingle()

  const num = data?.id ? (parseInt(data.id.slice(4)) || 0) : 0
  return `PRJ-${String(num + 1).padStart(4, '0')}`
}

// ─── Create ──────────────────────────────────────────────────

export async function createProject(
  input: ProjectInput,
  force = false,
): Promise<{ error?: string; id?: string; existingId?: string; existingName?: string; existingNameEn?: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'ไม่ได้รับอนุญาต' }

  // Duplicate guard: exact case-insensitive match on Thai OR English name
  if (!force) {
    const [{ data: byTh }, { data: byEn }] = await Promise.all([
      supabase.from('projects').select('id, name_th, name_en').ilike('name_th', input.name_th.trim()).limit(1).maybeSingle(),
      input.name_en?.trim()
        ? supabase.from('projects').select('id, name_th, name_en').ilike('name_en', input.name_en.trim()).limit(1).maybeSingle()
        : Promise.resolve({ data: null }),
    ])
    const existing = byTh ?? byEn
    if (existing) {
      return {
        existingId:     existing.id,
        existingName:   existing.name_th,
        existingNameEn: existing.name_en ?? null,
      }
    }
  }

  const id = await nextProjectId()

  const { error } = await supabase.from('projects').insert({
    id,
    created_by: user.id,
    ...input,
  })

  if (error) return { error: 'บันทึกไม่สำเร็จ: ' + error.message }

  revalidatePath('/projects')
  return { id }
}

// ─── Update (admin only) ──────────────────────────────────────

export async function updateProject(
  projectId: string,
  input: ProjectInput
): Promise<{ error?: string }> {
  if (!(await getIsAdmin())) return { error: 'เฉพาะแอดมินเท่านั้นที่แก้ไขข้อมูลโครงการได้' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'ไม่ได้รับอนุญาต' }

  const { error } = await supabase
    .from('projects')
    .update(input)
    .eq('id', projectId)

  if (error) return { error: 'บันทึกไม่สำเร็จ: ' + error.message }

  revalidatePath('/projects')
  revalidatePath(`/projects/${projectId}`)
  return {}
}

// ─── AI Enricher (with bilingual normalization) ───────────────

export async function enrichProject(
  rawName: string
): Promise<AiEnrichResult | { error: string }> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return { error: 'ไม่พบ Gemini API key' }

  try {
    const result = await identifyAndEnrichProject(rawName, apiKey)
    return result
  } catch {
    return { error: 'ค้นหาข้อมูลโครงการไม่สำเร็จ กรุณาลองใหม่' }
  }
}

// ─── Smart Project Search (Feature 5) ────────────────────────

export type ProjectSearchResult = {
  id: string
  name_th: string
  name_en: string | null
}

export async function searchProjects(
  query: string
): Promise<ProjectSearchResult[]> {
  if (!query.trim()) return []

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const q = query.trim()

  // Search name_th OR name_en with ilike, sort by name_en NULLS LAST then name_th
  const { data } = await supabase
    .from('projects')
    .select('id, name_th, name_en')
    .or(`name_th.ilike.%${q}%,name_en.ilike.%${q}%`)
    .order('name_en', { ascending: true, nullsFirst: false })
    .order('name_th', { ascending: true })
    .limit(20)

  return (data ?? []) as ProjectSearchResult[]
}
