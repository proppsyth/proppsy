import { createAdminClient } from '@/lib/supabase/server'
import { PLAN_LIMITS, resolvePlan, effectivePlan } from '@/types'
import type { Plan } from '@/types'

export interface PlanLimitRow {
  plan: string
  max_stock: number | null
  max_contracts_per_month: number | null
  ai_calls_per_month: number
  is_active: boolean
  price_monthly_thb: number
  price_yearly_thb: number
  feature_list: string[]
  display_order: number
}

// In-process cache — revalidated after admin updates via cache busting
let _cache: Record<string, PlanLimitRow> | null = null
let _cacheAt = 0
const CACHE_TTL_MS = 60_000 // 1 min

async function fetchAll(): Promise<Record<string, PlanLimitRow>> {
  if (_cache && Date.now() - _cacheAt < CACHE_TTL_MS) return _cache
  const admin = await createAdminClient()
  const { data } = await admin.from('plan_limits').select('*')
  if (data && data.length > 0) {
    const map: Record<string, PlanLimitRow> = {}
    for (const row of data) map[row.plan] = row as PlanLimitRow
    _cache = map
    _cacheAt = Date.now()
    return map
  }
  return {}
}

export function bustPlanLimitsCache() {
  _cache = null
  _cacheAt = 0
}

export async function getPlanLimits(plan: Plan): Promise<{
  maxStock: number | null
  maxContractsPerMonth: number | null
  aiCallsPerMonth: number
}> {
  try {
    const map = await fetchAll()
    const row = map[plan]
    if (row) {
      return {
        maxStock: row.max_stock,
        maxContractsPerMonth: row.max_contracts_per_month,
        aiCallsPerMonth: row.ai_calls_per_month,
      }
    }
  } catch {
    // fallback to static constant on any DB error
  }
  return PLAN_LIMITS[plan]
}

export async function getAllPlanLimits(): Promise<Record<string, PlanLimitRow>> {
  try {
    const map = await fetchAll()
    if (Object.keys(map).length > 0) return map
  } catch {
    // fallback
  }
  // Build fallback from static constant
  const fallback: Record<string, PlanLimitRow> = {}
  for (const [plan, limits] of Object.entries(PLAN_LIMITS)) {
    fallback[plan] = {
      plan,
      max_stock: limits.maxStock,
      max_contracts_per_month: limits.maxContractsPerMonth,
      ai_calls_per_month: limits.aiCallsPerMonth,
      is_active: true,
      price_monthly_thb: 0,
      price_yearly_thb: 0,
      feature_list: [],
      display_order: 0,
    }
  }
  return fallback
}

export async function getPlanLimitsByUserPlan(rawPlan?: string | null) {
  return getPlanLimits(resolvePlan(rawPlan))
}

/** Limits for a user, honouring plan expiry (expired paid plan → starter). */
export async function getPlanLimitsForUser(rawPlan?: string | null, expiresAt?: string | null) {
  return getPlanLimits(effectivePlan(rawPlan, expiresAt))
}
