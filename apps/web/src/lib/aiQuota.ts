'use server'
import { createClient } from '@/lib/supabase/server'
import { resolvePlan, PLAN_LIMITS } from '@/types'

export type AiQuotaInfo = { used: number; limit: number }

function resolveLimit(plan?: string | null, planExpiresAt?: string | null): number {
  const resolved = resolvePlan(plan)
  const base = PLAN_LIMITS[resolved].aiCallsPerMonth
  if (planExpiresAt && new Date(planExpiresAt) < new Date() && resolved !== 'starter') return 0
  return base
}

export async function getAiQuota(): Promise<AiQuotaInfo> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { used: 0, limit: 0 }

  const { data: p } = await supabase
    .from('profiles')
    .select('plan, plan_expires_at, ai_calls_this_month, ai_calls_month')
    .eq('id', user.id)
    .single()

  const limit = resolveLimit(p?.plan, p?.plan_expires_at)
  const currentMonth = new Date().toISOString().slice(0, 7) // YYYY-MM
  const used = (p?.ai_calls_month ?? '').slice(0, 7) === currentMonth
    ? (p?.ai_calls_this_month ?? 0)
    : 0

  return { used, limit }
}

export async function checkAiQuota(): Promise<{ allowed: boolean; used: number; limit: number; error?: string }> {
  const quota = await getAiQuota()
  if (quota.limit === 0) {
    return { ...quota, allowed: false, error: 'ไม่มีโควต้า AI กรุณาอัปเกรดแพ็กเกจ' }
  }
  if (quota.used >= quota.limit) {
    return { ...quota, allowed: false, error: `เกินโควต้า AI เดือนนี้แล้ว (${quota.limit} ครั้ง/เดือน)` }
  }
  return { ...quota, allowed: true }
}

export async function incrementAiUsage(): Promise<{ ok: boolean; used?: number; limit?: number; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'ไม่ได้รับอนุญาต' }

  const { data, error } = await supabase.rpc('increment_ai_usage', { p_user_id: user.id })
  if (error) return { ok: false, error: error.message }
  if (data?.error) return { ok: false, error: data.error as string }

  return { ok: true, used: data?.used as number, limit: data?.limit as number }
}
