'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { notify } from '@/lib/notifications/notify'

/**
 * Check for stock items with contract_end_date within 30 or 7 days and fire
 * notifications if not already sent within the past 3 days (dedup window).
 * Called server-side on each calendar page render — no cron job needed.
 */
export async function checkLeaseExpiryNotifications(): Promise<void> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const today = new Date()
    const in7  = new Date(today); in7.setDate(today.getDate() + 7)
    const in30 = new Date(today); in30.setDate(today.getDate() + 30)
    const todayStr = today.toLocaleDateString('en-CA')
    const in30Str  = in30.toLocaleDateString('en-CA')

    // Stock items expiring within 30 days
    const { data: stocks } = await supabase
      .from('stock')
      .select('id, unit_no, project_name, contract_end_date')
      .eq('agent_uid', user.id)
      .eq('status', 'rented')
      .gte('contract_end_date', todayStr)
      .lte('contract_end_date', in30Str)

    if (!stocks?.length) return

    const admin = await createAdminClient()
    const dedupSince = new Date(today); dedupSince.setDate(today.getDate() - 3)

    for (const s of stocks) {
      if (!s.contract_end_date) continue
      const endDate = new Date(s.contract_end_date + 'T00:00:00')
      const daysLeft = Math.round((endDate.getTime() - today.getTime()) / 86_400_000)
      const type = daysLeft <= 7 ? 'lease_expiry_7' : 'lease_expiry_30'
      const label = s.unit_no ? `${s.project_name ?? ''} ห้อง ${s.unit_no}` : (s.project_name ?? s.id)

      // Skip if already notified for this stock+type in the last 3 days
      const { count } = await admin
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('type', type)
        .ilike('url', `%/stock/${s.id}%`)
        .gte('created_at', dedupSince.toISOString())

      if ((count ?? 0) > 0) continue

      const endStr = endDate.toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })
      await notify({
        user_id: user.id,
        type,
        title:   daysLeft <= 7
          ? `⚠️ สัญญาเช่าหมดในอีก ${daysLeft} วัน`
          : `🏠 สัญญาเช่าใกล้หมดใน 30 วัน`,
        message: `${label} — สัญญาสิ้นสุด ${endStr}`,
        url:     `/stock/${s.id}`,
      })
    }
  } catch (err) {
    // Non-blocking — never crash the calendar page
    console.error('[checkLeaseExpiry]', err)
  }
}
