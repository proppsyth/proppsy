'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { logActivity } from '@/lib/activity/log'

async function assertAdmin(): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') throw new Error('Forbidden')
}

// ─── Types ────────────────────────────────────────────────────────────────

export interface AliasRow {
  id: string
  project_id: string
  alias_name: string
  language: 'th' | 'en' | 'other'
  created_at: string
  project_name_th: string
  project_name_en: string | null
}

export interface DuplicatePair {
  project_a_id: string
  project_a_name_th: string
  project_a_name_en: string | null
  project_b_id: string
  project_b_name_th: string
  project_b_name_en: string | null
  similarity_score: number
}

// ─── Add alias ────────────────────────────────────────────────────────────

export async function addProjectAlias(
  projectId: string,
  aliasName: string,
  language: 'th' | 'en' | 'other',
): Promise<{ error?: string; id?: string }> {
  try {
    await assertAdmin()
    const admin = await createAdminClient()

    const trimmed = aliasName.trim()
    if (!trimmed) return { error: 'กรุณาระบุชื่อ alias' }

    const { data, error } = await admin
      .from('project_aliases')
      .insert({ project_id: projectId, alias_name: trimmed, language })
      .select('id')
      .single()

    if (error) {
      if (error.code === '23505') return { error: 'ชื่อ alias นี้มีอยู่แล้ว' }
      return { error: error.message }
    }

    const { data: { user } } = await admin.auth.getUser()
    await logActivity({
      userId: user?.id,
      entityType: 'project',
      entityId: projectId,
      action: 'alias_added',
      title: `เพิ่ม alias "${trimmed}"`,
      metadata: { alias_id: data.id, language },
    })

    revalidatePath('/admin/projects/aliases')
    return { id: data.id }
  } catch {
    return { error: 'ไม่มีสิทธิ์' }
  }
}

// ─── Remove alias ─────────────────────────────────────────────────────────

export async function removeProjectAlias(aliasId: string): Promise<{ error?: string }> {
  try {
    await assertAdmin()
    const admin = await createAdminClient()
    const { error } = await admin.from('project_aliases').delete().eq('id', aliasId)
    if (error) return { error: error.message }
    revalidatePath('/admin/projects/aliases')
    return {}
  } catch {
    return { error: 'ไม่มีสิทธิ์' }
  }
}

// ─── Link duplicate as alias ──────────────────────────────────────────────
// Adds the non-canonical project's names as aliases of the canonical project.
// Does NOT merge or delete either project.

export async function linkDuplicateAsAlias(
  canonicalProjectId: string,
  otherProjectId: string,
): Promise<{ error?: string; count?: number }> {
  try {
    await assertAdmin()
    const admin = await createAdminClient()

    const { data: other } = await admin
      .from('projects')
      .select('name_th, name_en')
      .eq('id', otherProjectId)
      .single()

    if (!other) return { error: 'ไม่พบโครงการ' }

    const toInsert: { project_id: string; alias_name: string; language: 'th' | 'en' | 'other' }[] = []

    if (other.name_th?.trim()) {
      toInsert.push({ project_id: canonicalProjectId, alias_name: other.name_th.trim(), language: 'th' })
    }
    if (other.name_en?.trim() && other.name_en.trim() !== other.name_th?.trim()) {
      toInsert.push({ project_id: canonicalProjectId, alias_name: other.name_en.trim(), language: 'en' })
    }

    if (toInsert.length === 0) return { error: 'ไม่มีชื่อที่จะเพิ่มเป็น alias' }

    // Use upsert to skip duplicates (conflict on lower(alias_name))
    const { error } = await admin
      .from('project_aliases')
      .upsert(toInsert, { onConflict: 'alias_name', ignoreDuplicates: true })

    if (error) return { error: error.message }

    revalidatePath('/admin/projects/aliases')
    revalidatePath('/admin/projects/duplicates')
    return { count: toInsert.length }
  } catch {
    return { error: 'ไม่มีสิทธิ์' }
  }
}

// ─── Load all aliases (admin page) ────────────────────────────────────────

export async function getAllAliases(): Promise<AliasRow[]> {
  const admin = await createAdminClient()
  const { data } = await admin
    .from('project_aliases')
    .select('id, project_id, alias_name, language, created_at, projects!inner(name_th, name_en)')
    .order('created_at', { ascending: false })

  return (data ?? []).map(row => {
    const proj = row.projects as unknown as { name_th: string; name_en: string | null }
    return {
      id:              row.id,
      project_id:      row.project_id,
      alias_name:      row.alias_name,
      language:        row.language as 'th' | 'en' | 'other',
      created_at:      row.created_at,
      project_name_th: proj?.name_th ?? '-',
      project_name_en: proj?.name_en ?? null,
    }
  })
}

// ─── Delete project (admin only) ─────────────────────────────────────────
// If replacementProjectId is provided, all stock in the project will be
// reassigned to it before deleting. Aliases are cascade-deleted by DB FK.

export async function deleteProject(
  projectId: string,
  replacementProjectId?: string,
): Promise<{ error?: string }> {
  try {
    await assertAdmin()
    const admin = await createAdminClient()

    if (replacementProjectId) {
      // Reassign all stock to the replacement project
      const { error: moveErr } = await admin
        .from('stock')
        .update({ project_id: replacementProjectId })
        .eq('project_id', projectId)
      if (moveErr) return { error: 'ย้ายทรัพย์ไม่สำเร็จ: ' + moveErr.message }
    }

    const { error } = await admin.from('projects').delete().eq('id', projectId)
    if (error) return { error: 'ลบโครงการไม่สำเร็จ: ' + error.message }

    revalidatePath('/admin/projects')
    revalidatePath('/projects')
    return {}
  } catch {
    return { error: 'ไม่มีสิทธิ์' }
  }
}

// ─── Load potential duplicates (admin page) ───────────────────────────────

export async function getPotentialDuplicates(threshold = 0.5): Promise<DuplicatePair[]> {
  const admin = await createAdminClient()
  const { data, error } = await admin.rpc('find_project_duplicates', { sim_threshold: threshold })
  if (error) return []
  return (data ?? []) as DuplicatePair[]
}
