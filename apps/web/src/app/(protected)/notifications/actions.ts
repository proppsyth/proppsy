'use server'

import { createClient } from '@/lib/supabase/server'
import type { AppNotification } from '@/lib/notifications/types'

export async function fetchNotifications(limit = 50): Promise<AppNotification[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('notifications')
    .select('id, user_id, type, title, message, url, is_read, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit)

  return (data as AppNotification[]) ?? []
}

export async function markNotificationRead(id: string): Promise<void> {
  const supabase = await createClient()
  await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', id)
}

export async function markAllNotificationsRead(): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', user.id)
    .eq('is_read', false)
}
