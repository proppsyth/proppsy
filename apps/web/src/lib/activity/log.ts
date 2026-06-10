'use server'

import { createAdminClient } from '@/lib/supabase/server'

export type EntityType =
  | 'stock' | 'project' | 'owner' | 'tenant' | 'booking' | 'lease'
  | 'renewal' | 'termination' | 'esign' | 'invoice' | 'receipt'
  | 'commission' | 'coagent'

export interface LogParams {
  userId?: string | null
  entityType: EntityType
  entityId: string
  action: string
  title: string
  description?: string
  metadata?: Record<string, unknown>
}

/**
 * Fire-and-forget activity logger. Wraps in try/catch so failures never
 * block the caller. Always await — Next.js server actions must complete
 * all async work before returning.
 */
export async function logActivity(params: LogParams): Promise<void> {
  try {
    const admin = await createAdminClient()
    await admin.from('activity_logs').insert({
      user_id:     params.userId ?? null,
      entity_type: params.entityType,
      entity_id:   params.entityId,
      action:      params.action,
      title:       params.title,
      description: params.description ?? null,
      metadata:    params.metadata ?? null,
    })
  } catch {
    // intentional no-op — logging must never block business logic
  }
}

export interface ActivityLogEntry {
  id: string
  user_id: string | null
  entity_type: EntityType
  entity_id: string
  action: string
  title: string
  description: string | null
  metadata: Record<string, unknown> | null
  created_at: string
}

/** Fetch recent activity for a specific entity (server component use). */
export async function getEntityActivity(
  entityType: EntityType | EntityType[],
  entityId: string,
  limit = 20
): Promise<ActivityLogEntry[]> {
  try {
    const admin = await createAdminClient()
    const types = Array.isArray(entityType) ? entityType : [entityType]
    const { data } = await admin
      .from('activity_logs')
      .select('*')
      .in('entity_type', types)
      .eq('entity_id', entityId)
      .order('created_at', { ascending: false })
      .limit(limit)
    return (data ?? []) as ActivityLogEntry[]
  } catch {
    return []
  }
}

/** Fetch recent activity for a user's dashboard feed (server component use). */
export async function getUserActivity(
  userId: string,
  limit = 40,
  offset = 0
): Promise<ActivityLogEntry[]> {
  try {
    const admin = await createAdminClient()
    const { data } = await admin
      .from('activity_logs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)
    return (data ?? []) as ActivityLogEntry[]
  } catch {
    return []
  }
}
