// Server-side only — import only from server actions / route handlers

import { createAdminClient } from '@/lib/supabase/server'
import type { NotifyInput } from './types'

/**
 * Create a notification record and fire a browser push (if subscribed).
 *
 * Usage — from any server action:
 *   await notify({ user_id, type: 'lease_created', title: '...', message: '...', url: '/contracts/BK-0001' })
 */
export async function notify(input: NotifyInput): Promise<void> {
  const admin = await createAdminClient()

  const { error } = await admin.from('notifications').insert({
    user_id: input.user_id,
    type:    input.type,
    title:   input.title,
    message: input.message ?? '',
    url:     input.url ?? null,
    is_read: false,
  })

  if (error) {
    console.error('[notify] insert failed:', error.message)
    return
  }

  // Non-blocking push — errors are swallowed so the primary action never fails
  void sendPushToUser(input.user_id, {
    title:   input.title,
    message: input.message ?? '',
    url:     input.url ?? undefined,
  })
}

// ─── Push delivery ───────────────────────────────────────────

interface PushPayload {
  title: string
  message: string
  url?: string
}

async function sendPushToUser(userId: string, data: PushPayload): Promise<void> {
  const publicKey  = process.env.VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  if (!publicKey || !privateKey) return  // push not configured

  try {
    // Dynamic import so web-push is only loaded when push is actually needed
    const webpush = (await import('web-push')).default
    webpush.setVapidDetails('mailto:proppsyth@gmail.com', publicKey, privateKey)

    const admin = await createAdminClient()
    const { data: subs } = await admin
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth_key')
      .eq('user_id', userId)

    if (!subs?.length) return

    await Promise.allSettled(
      subs.map(async sub => {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth_key } },
            JSON.stringify(data),
          )
        } catch (err: unknown) {
          // 410 Gone = subscription expired; clean it up
          const status = (err as Record<string, unknown>)?.statusCode
          if (status === 410) {
            await admin.from('push_subscriptions').delete().eq('id', sub.id)
          }
        }
      }),
    )
  } catch (err) {
    console.error('[push] send failed:', err)
  }
}
