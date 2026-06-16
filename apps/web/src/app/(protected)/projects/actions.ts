'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { identifyAndEnrichProject } from '@/lib/ai/projectIdentity'
import { logActivity } from '@/lib/activity/log'

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
  transit_distances?: object[] | null
  nearby_amenities?: object[] | null
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
  /** Developer name in English */
  developer?: string | null
  built_year?: number | null
  total_floors?: number | null
  total_units?: number | null
  parking_pct?: number | null
  facilities?: string[]
  bts_mrt?: string[]
  transit_distances?: object[] | null
  nearby_amenities?: object[] | null
  map_url?: string | null
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
): Promise<{
  error?: string
  id?: string
  existingId?: string
  existingName?: string
  existingNameEn?: string | null
  matchType?: 'exact' | 'alias' | 'fuzzy'
}> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'ไม่ได้รับอนุญาต' }

  if (!force) {
    const nameTh = input.name_th.trim()
    const nameEn = input.name_en?.trim() ?? null

    // Step 1: Exact case-insensitive match on Thai OR English name
    const [{ data: byTh }, { data: byEn }] = await Promise.all([
      supabase.from('projects').select('id, name_th, name_en').ilike('name_th', nameTh).limit(1).maybeSingle(),
      nameEn
        ? supabase.from('projects').select('id, name_th, name_en').ilike('name_en', nameEn).limit(1).maybeSingle()
        : Promise.resolve({ data: null }),
    ])
    const exact = byTh ?? byEn
    if (exact) {
      return { existingId: exact.id, existingName: exact.name_th, existingNameEn: exact.name_en ?? null, matchType: 'exact' }
    }

    // Step 2: Alias match
    const { data: aliasRow } = await supabase
      .from('project_aliases')
      .select('project_id')
      .ilike('alias_name', nameTh)
      .limit(1)
      .maybeSingle()
    if (aliasRow?.project_id) {
      const { data: aliasProj } = await supabase
        .from('projects')
        .select('id, name_th, name_en')
        .eq('id', aliasRow.project_id)
        .maybeSingle()
      if (aliasProj) {
        return { existingId: aliasProj.id, existingName: aliasProj.name_th, existingNameEn: aliasProj.name_en ?? null, matchType: 'alias' }
      }
    }

    // Step 3: Fuzzy pg_trgm match (threshold 0.5; score ≥ 0.62 triggers suggestion)
    const { data: fuzzyRows } = await supabase.rpc('find_project_fuzzy', {
      query_name: nameTh,
      sim_threshold: 0.5,
    })
    type FuzzyRow = { project_id: string; project_name_th: string; project_name_en: string | null; score: number }
    const best = (fuzzyRows as FuzzyRow[] | null)?.[0]
    if (best && best.score >= 0.62) {
      return { existingId: best.project_id, existingName: best.project_name_th, existingNameEn: best.project_name_en, matchType: 'fuzzy' }
    }
  }

  const id = await nextProjectId()

  const { error } = await supabase.from('projects').insert({
    id,
    created_by: user.id,
    ...input,
  })

  if (error) return { error: 'บันทึกไม่สำเร็จ: ' + error.message }

  await logActivity({
    userId: user.id,
    entityType: 'project',
    entityId: id,
    action: 'created',
    title: `เพิ่มโครงการ ${input.name_th}`,
    description: input.name_en ?? undefined,
  })

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
    if (result.developer) {
      result.developer = await resolveExistingDeveloperName(result.developer)
    }
    return result
  } catch {
    return { error: 'ค้นหาข้อมูลโครงการไม่สำเร็จ กรุณาลองใหม่' }
  }
}

// Reuse an existing developer name from the DB if it matches (case/whitespace
// insensitive), so the AI lookup doesn't create near-duplicate developer entries.
async function resolveExistingDeveloperName(name: string): Promise<string> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('projects')
    .select('developer')
    .not('developer', 'is', null)

  const target = name.trim().toLowerCase()
  const existing = (data ?? [])
    .map(r => r.developer)
    .find((d): d is string => !!d && d.trim().toLowerCase() === target)

  return existing ?? name
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

  // Search projects directly AND via alias names in parallel
  const [{ data: directMatches }, { data: aliasMatchRows }] = await Promise.all([
    supabase
      .from('projects')
      .select('id, name_th, name_en')
      .or(`name_th.ilike.%${q}%,name_en.ilike.%${q}%`)
      .order('name_en', { ascending: true, nullsFirst: false })
      .order('name_th', { ascending: true })
      .limit(20),
    supabase
      .from('project_aliases')
      .select('project_id')
      .ilike('alias_name', `%${q}%`)
      .limit(10),
  ])

  // Fetch projects for any alias hits (batch)
  const aliasIds = [...new Set((aliasMatchRows ?? []).map(r => r.project_id))]
  const { data: aliasProjects } = aliasIds.length > 0
    ? await supabase.from('projects').select('id, name_th, name_en').in('id', aliasIds)
    : { data: [] as ProjectSearchResult[] }

  // Merge, deduplicate by project ID (direct matches take priority)
  const seen = new Set<string>()
  const results: ProjectSearchResult[] = []
  for (const p of directMatches ?? []) {
    if (!seen.has(p.id)) { seen.add(p.id); results.push(p as ProjectSearchResult) }
  }
  for (const p of aliasProjects ?? []) {
    if (!seen.has(p.id)) { seen.add(p.id); results.push(p as ProjectSearchResult) }
  }
  return results.slice(0, 20)
}
