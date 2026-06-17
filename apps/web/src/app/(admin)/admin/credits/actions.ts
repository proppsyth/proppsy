'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { sendEmail, buildCreditGrantedEmail, siteUrl } from '@/lib/email'

async function assertAdmin(): Promise<string> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') throw new Error('Forbidden')
  return user.id
}

export async function adminAdjustCredits(params: {
  userId: string
  amount: number
  note: string
}): Promise<{ error?: string; newBalance?: number }> {
  try {
    await assertAdmin()
    const admin = await createAdminClient()

    if (params.amount === 0) return { error: 'จำนวนเครดิตต้องไม่เป็น 0' }

    if (params.amount > 0) {
      const { data } = await admin.rpc('grant_credits', {
        p_user_id:     params.userId,
        p_amount:      params.amount,
        p_tx_type:     'assign',
        p_description: params.note || 'ปรับเครดิตโดยแอดมิน',
        p_is_reset:    false,
      })
      if (!data?.ok) return { error: data?.error ?? 'ล้มเหลว' }

      // Notify the agent that admin added credits — best-effort, non-blocking
      try {
        const { data: authUser } = await admin.auth.admin.getUserById(params.userId)
        const email = authUser?.user?.email
        if (email) {
          const { data: prof } = await admin.from('profiles').select('name').eq('id', params.userId).maybeSingle()
          const { subject, html } = buildCreditGrantedEmail({
            name: (prof as { name?: string } | null)?.name ?? undefined,
            amount: params.amount,
            note: params.note || undefined,
            newBalance: data.balance,
            creditsUrl: `${siteUrl()}/credits`,
          })
          await sendEmail({ to: email, subject, html })
        }
      } catch (err) {
        console.error('credit grant email error:', err)
      }

      revalidatePath('/admin/credits')
      return { newBalance: data.balance }
    } else {
      const { data } = await admin.rpc('spend_credits', {
        p_user_id:      params.userId,
        p_amount:       Math.abs(params.amount),
        p_tx_type:      'assign',
        p_description:  params.note || 'หักเครดิตโดยแอดมิน',
        p_reference_id: null,
        p_metadata:     { admin_deduction: true },
      })
      if (data?.error === 'insufficient_credits') return { error: 'เครดิตไม่เพียงพอสำหรับการหัก' }
      if (data?.error) return { error: data.error }
      revalidatePath('/admin/credits')
      return { newBalance: data?.balance }
    }
  } catch {
    return { error: 'ไม่มีสิทธิ์' }
  }
}
