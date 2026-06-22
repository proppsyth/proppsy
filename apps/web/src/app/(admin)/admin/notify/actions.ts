'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { notify } from '@/lib/notifications/notify'

async function assertAdmin(): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') throw new Error('Forbidden')
}

/** Broadcast an announcement to every approved, active agent's bell (+ push). */
export async function broadcastAnnouncement(input: {
  title: string
  message: string
  url?: string
}): Promise<{ error?: string; sent?: number }> {
  try {
    await assertAdmin()
    const title = input.title.trim()
    if (!title) return { error: 'กรุณาระบุหัวข้อ' }

    const admin = createServiceClient()
    const { data: users } = await admin
      .from('profiles')
      .select('id')
      .eq('account_status', 'approved')
      .is('deleted_at', null)

    const ids = (users ?? []).map(u => u.id as string)
    // announcements bypass per-user prefs (see categories.ts)
    for (const id of ids) {
      await notify({
        user_id: id,
        type:    'announcement',
        title:   `📣 ${title}`,
        message: input.message.trim(),
        url:     input.url?.trim() || undefined,
      })
    }
    return { sent: ids.length }
  } catch {
    return { error: 'ไม่มีสิทธิ์' }
  }
}

/** Manually run the daily cron now (admin tool / testing). */
export async function runCronNow(): Promise<{ error?: string; result?: string }> {
  try {
    await assertAdmin()
    const secret = process.env.CRON_SECRET
    const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.proppsy.com'
    const res = await fetch(`${base}/api/cron/line-reminders`, {
      headers: secret ? { Authorization: `Bearer ${secret}` } : {},
      cache: 'no-store',
    })
    return { result: await res.text() }
  } catch (e) {
    return { error: (e as Error).message }
  }
}
