'use server'
import { createClient } from '@/lib/supabase/server'
import { resolvePlan, PLAN_LIMITS } from '@/types'

// Starter plan = 0 (blocked by PLAN_LIMITS.ai), paid plans get daily quota
const DAILY_QUOTA: Record<string, number> = {
  professional: 30,
  business: 100,
}

export async function checkAiQuota(): Promise<{ allowed: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { allowed: false, error: 'ไม่ได้รับอนุญาต' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('plan, ai_calls_today, ai_calls_date')
    .eq('id', user.id)
    .single()

  const plan = resolvePlan(profile?.plan)
  if (!PLAN_LIMITS[plan].ai) return { allowed: false, error: 'ฟีเจอร์ AI ต้องใช้แพ็กเกจ AI Pro ขึ้นไป' }

  const quota = DAILY_QUOTA[plan] ?? 30
  const todayStr = new Date().toLocaleDateString('en-CA')
  const callsToday = profile?.ai_calls_date === todayStr ? (profile.ai_calls_today ?? 0) : 0

  if (callsToday >= quota) {
    return { allowed: false, error: `เกินโควต้า AI วันนี้แล้ว (${quota} ครั้ง/วัน) กรุณาลองใหม่พรุ่งนี้` }
  }

  // Increment counter
  await supabase.from('profiles').update({
    ai_calls_today: callsToday + 1,
    ai_calls_date: todayStr,
  }).eq('id', user.id)

  return { allowed: true }
}
