'use server'

import { createAdminClient, createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { bustPlanLimitsCache } from '@/lib/planLimits'

export type PlanLimitsInput = {
  plan: string
  max_stock: number | null
  max_contracts_per_month: number | null
  ai_calls_per_month: number
}

export async function updatePlanLimits(input: PlanLimitsInput): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'ไม่ได้รับอนุญาต' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') return { error: 'ต้องเป็น admin เท่านั้น' }

  const admin = await createAdminClient()
  const { error } = await admin
    .from('plan_limits')
    .upsert({
      plan: input.plan,
      max_stock: input.max_stock,
      max_contracts_per_month: input.max_contracts_per_month,
      ai_calls_per_month: input.ai_calls_per_month,
      updated_at: new Date().toISOString(),
      updated_by: user.id,
    }, { onConflict: 'plan' })

  if (error) return { error: error.message }

  bustPlanLimitsCache()
  revalidatePath('/admin/packages')
  return {}
}
