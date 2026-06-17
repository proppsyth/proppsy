'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { grantStarterCredits } from '@/lib/credits/actions'
import { sendEmail, buildApprovedEmail, buildPlanChangedEmail, siteUrl } from '@/lib/email'
import type { Role, AccountStatus, Plan } from '@/types'

async function assertAdmin(): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') throw new Error('Forbidden')
}

export async function approveUser(userId: string): Promise<void> {
  await assertAdmin()
  const admin = await createAdminClient()
  const [{ data: profile }, { data: credits }] = await Promise.all([
    admin.from('profiles').select('account_status, name').eq('id', userId).single(),
    admin.from('credits').select('total_earned').eq('user_id', userId).maybeSingle(),
  ])
  const wasApproved = profile?.account_status === 'approved'
  await admin.from('profiles').update({ account_status: 'approved' }).eq('id', userId)
  // Only grant starter credits if the user hasn't received any yet
  // (credits are granted at registration — this prevents double-granting)
  if (!wasApproved && !(credits && credits.total_earned > 0)) {
    await grantStarterCredits(userId)
  }

  // Notify the agent by email — only on the transition into approved
  if (!wasApproved) {
    try {
      const { data: authUser } = await admin.auth.admin.getUserById(userId)
      const email = authUser?.user?.email
      if (email) {
        const { subject, html } = buildApprovedEmail({
          name: (profile as { name?: string } | null)?.name ?? undefined,
          dashboardUrl: `${siteUrl()}/dashboard`,
        })
        await sendEmail({ to: email, subject, html })
      }
    } catch (err) {
      console.error('approval email error:', err)
    }
  }

  revalidatePath('/admin/users')
}

export async function rejectUser(userId: string): Promise<void> {
  await assertAdmin()
  const admin = await createAdminClient()
  await admin.from('profiles').update({ account_status: 'rejected' }).eq('id', userId)
  revalidatePath('/admin/users')
}

export async function updateUser(userId: string, data: {
  name?: string
  nickname?: string
  phone?: string
  line_id?: string
  position?: string
  company_name?: string
  tax_id?: string
  national_id?: string
  address_no?: string
  address_road?: string
  province?: string
  district?: string
  subdistrict?: string
  zip?: string
  role?: Role
  account_status?: AccountStatus
  plan?: Plan
  plan_expires_at?: string | null
}): Promise<{ error?: string }> {
  try {
    await assertAdmin()
    const admin = await createAdminClient()

    // Snapshot current state to detect meaningful transitions for notifications
    const { data: before } = await admin
      .from('profiles')
      .select('account_status, plan, name')
      .eq('id', userId)
      .maybeSingle()

    const { error } = await admin.from('profiles').update(data).eq('id', userId)
    if (error) return { error: error.message }

    const prevPlan = (before as { plan?: string | null } | null)?.plan ?? 'starter'
    const prevStatus = (before as { account_status?: string } | null)?.account_status
    const name = (before as { name?: string } | null)?.name ?? undefined
    const justApproved = data.account_status === 'approved' && prevStatus !== 'approved'
    const planChanged = data.plan != null && data.plan !== prevPlan

    if (justApproved || planChanged) {
      try {
        const { data: authUser } = await admin.auth.admin.getUserById(userId)
        const email = authUser?.user?.email
        if (email) {
          if (justApproved) {
            const { subject, html } = buildApprovedEmail({ name, dashboardUrl: `${siteUrl()}/dashboard` })
            await sendEmail({ to: email, subject, html })
          }
          if (planChanged && data.plan) {
            const { subject, html } = buildPlanChangedEmail({
              name,
              plan: data.plan,
              planExpiresAt: data.plan_expires_at ?? null,
              profileUrl: `${siteUrl()}/profile`,
            })
            await sendEmail({ to: email, subject, html })
          }
        }
      } catch (err) {
        console.error('updateUser email error:', err)
      }
    }

    revalidatePath('/admin/users')
    return {}
  } catch {
    return { error: 'ไม่มีสิทธิ์' }
  }
}

export async function deactivateUser(userId: string, reason?: string): Promise<{ error?: string }> {
  try {
    await assertAdmin()
    const admin = await createAdminClient()
    const { error } = await admin
      .from('profiles')
      .update({
        deleted_at: new Date().toISOString(),
        deletion_reason: reason ?? 'ปิดการใช้งานโดยแอดมิน',
      })
      .eq('id', userId)
    if (error) return { error: error.message }
    // Kill active sessions — non-fatal, Supabase client returns {error} rather than throwing
    await admin.rpc('kill_user_sessions', { p_user_id: userId })
    revalidatePath('/admin/users')
    return {}
  } catch {
    return { error: 'ไม่มีสิทธิ์' }
  }
}

export async function deleteUser(userId: string): Promise<{ error?: string }> {
  try {
    await assertAdmin()
    const admin = await createAdminClient()
    // Hard-delete: removes the auth user row; FK cascades handle dependent rows.
    const { error } = await admin.auth.admin.deleteUser(userId)
    if (error) return { error: error.message }
    revalidatePath('/admin/users')
    return {}
  } catch {
    return { error: 'ไม่มีสิทธิ์' }
  }
}

export async function restoreUser(userId: string): Promise<{ error?: string }> {
  try {
    await assertAdmin()
    const admin = await createAdminClient()
    const { error } = await admin
      .from('profiles')
      .update({ deleted_at: null, deletion_reason: null })
      .eq('id', userId)
    if (error) return { error: error.message }
    revalidatePath('/admin/users')
    return {}
  } catch {
    return { error: 'ไม่มีสิทธิ์' }
  }
}
