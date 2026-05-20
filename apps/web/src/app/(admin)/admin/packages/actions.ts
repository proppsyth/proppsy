'use server'

import { createAdminClient, createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { bustPlanLimitsCache } from '@/lib/planLimits'
import type { Plan } from '@/types'

export type PlanLimitsInput = {
  plan: string
  max_stock: number | null
  max_contracts_per_month: number | null
  ai_calls_per_month: number
  is_active: boolean
  price_monthly_thb: number
  price_yearly_thb: number
  feature_list: string[]
}

async function assertAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') throw new Error('Forbidden')
  return user.id
}

export async function updatePlanLimits(input: PlanLimitsInput): Promise<{ error?: string }> {
  try {
    const userId = await assertAdmin()
    const admin = await createAdminClient()
    const { error } = await admin
      .from('plan_limits')
      .upsert({
        plan: input.plan,
        max_stock: input.max_stock,
        max_contracts_per_month: input.max_contracts_per_month,
        ai_calls_per_month: input.ai_calls_per_month,
        is_active: input.is_active,
        price_monthly_thb: input.price_monthly_thb,
        price_yearly_thb: input.price_yearly_thb,
        feature_list: input.feature_list,
        updated_at: new Date().toISOString(),
        updated_by: userId,
      }, { onConflict: 'plan' })

    if (error) return { error: error.message }
    bustPlanLimitsCache()
    revalidatePath('/admin/packages')
    return {}
  } catch (e) {
    return { error: (e as Error).message }
  }
}

export async function setUserPlan(
  userId: string,
  plan: Plan,
  planExpiresAt: string | null,
): Promise<{ error?: string }> {
  try {
    await assertAdmin()
    const admin = await createAdminClient()
    const { error } = await admin
      .from('profiles')
      .update({ plan, plan_expires_at: planExpiresAt })
      .eq('id', userId)
    if (error) return { error: error.message }
    revalidatePath('/admin/packages')
    revalidatePath('/admin/users')
    return {}
  } catch (e) {
    return { error: (e as Error).message }
  }
}
