'use server'

import { createAdminClient, createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { bustPlanLimitsCache } from '@/lib/planLimits'
import { sendEmail, buildPlanChangedEmail, siteUrl } from '@/lib/email'
import { notify } from '@/lib/notifications/notify'
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

    await notify({
      user_id: userId,
      type:    'admin_plan_changed',
      title:   '📦 แพ็กเกจของคุณถูกอัปเดต',
      message: `แพ็กเกจปัจจุบัน: ${plan}${planExpiresAt ? ` · หมดอายุ ${new Date(planExpiresAt).toLocaleDateString('th-TH')}` : ''}`,
      url:     '/profile',
    })

    // Notify the agent that admin changed their plan — best-effort, non-blocking
    try {
      const { data: authUser } = await admin.auth.admin.getUserById(userId)
      const email = authUser?.user?.email
      if (email) {
        const { data: prof } = await admin.from('profiles').select('name').eq('id', userId).maybeSingle()
        const { subject, html } = buildPlanChangedEmail({
          name: (prof as { name?: string } | null)?.name ?? undefined,
          plan,
          planExpiresAt,
          profileUrl: `${siteUrl()}/profile`,
        })
        await sendEmail({ to: email, subject, html })
      }
    } catch (err) {
      console.error('plan change email error:', err)
    }

    revalidatePath('/admin/packages')
    revalidatePath('/admin/users')
    return {}
  } catch (e) {
    return { error: (e as Error).message }
  }
}
