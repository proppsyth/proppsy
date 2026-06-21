'use server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { resolvePlan } from '@/types'
import { getPlanLimits } from '@/lib/planLimits'
import { notify } from '@/lib/notifications/notify'

export type AiQuotaInfo = { used: number; limit: number }

async function resolveLimit(plan?: string | null, planExpiresAt?: string | null): Promise<number> {
  const resolved = resolvePlan(plan)
  const limits = await getPlanLimits(resolved)
  const base = limits.aiCallsPerMonth
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

  const limit = await resolveLimit(p?.plan, p?.plan_expires_at)
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

  // Pure service-role client (no user cookie → role=service_role). The RPC is
  // SECURITY DEFINER with EXECUTE revoked from anon/authenticated, and
  // createAdminClient would still run as the user's JWT role, so use
  // createServiceClient here.
  const admin = createServiceClient()
  const { data, error } = await admin.rpc('increment_ai_usage', { p_user_id: user.id })
  if (error) return { ok: false, error: error.message }
  if (data?.error) return { ok: false, error: data.error as string }

  const used = data?.used as number
  const limit = data?.limit as number
  await notify({
    user_id: user.id,
    type:    'ai_used',
    title:   '✨ ใช้ AI 1 ครั้ง',
    message: `เหลือโควต้า AI ${Math.max(0, limit - used)}/${limit} ครั้งในเดือนนี้`,
  })

  return { ok: true, used, limit }
}
