'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { Bell, X, CheckCheck, Loader2, BellOff, BellRing, Settings } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import {
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from '@/app/(protected)/notifications/actions'
import { usePushNotifications } from '@/hooks/usePushNotifications'
import NotificationIcon from './NotificationIcon'
import type { AppNotification } from '@/lib/notifications/types'

interface Props {
  userId: string
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60_000)
  if (m < 1)  return 'เมื่อกี้'
  if (m < 60) return `${m} นาทีที่แล้ว`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} ชั่วโมงที่แล้ว`
  const d = Math.floor(h / 24)
  if (d < 7)  return `${d} วันที่แล้ว`
  return new Date(iso).toLocaleDateString('th-TH', { month: 'short', day: 'numeric' })
}

export default function NotificationBell({ userId }: Props) {
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [open, setOpen]     = useState(false)
  const [loading, setLoading] = useState(false)
  const [mounted, setMounted] = useState(false)
  const loadedRef = useRef(false)

  // Track open state in a ref so the Realtime callback can read it without
  // being listed as a dependency (which would cause re-subscribe on every toggle).
  const openRef = useRef(false)
  useEffect(() => { openRef.current = open }, [open])

  const { permission, subscribed, loading: pushLoading, subscribe, unsubscribe } =
    usePushNotifications()

  const unreadCount = notifications.filter(n => !n.is_read).length

  // Hydration guard for createPortal
  useEffect(() => { setMounted(true) }, [])

  // Fetch on mount for badge count
  useEffect(() => {
    fetchNotifications(20).then(data => setNotifications(data))
  }, [])

  // Fetch full list on first panel open
  useEffect(() => {
    if (!open || loadedRef.current) return
    loadedRef.current = true
    setLoading(true)
    fetchNotifications(50).then(data => { setNotifications(data); setLoading(false) })
  }, [open])

  // ── Supabase Realtime subscription ──────────────────────────────────────
  // Rules that MUST be followed:
  //   1. channel.on(...)  BEFORE  channel.subscribe()  — Supabase throws otherwise
  //   2. Use a unique channel name per mount so that React Strict Mode's
  //      double-invoke doesn't call .on() on a channel already in 'leaving' state
  //      (createBrowserClient is a singleton; channel() returns the existing object
  //       when the name matches, and that object may still be non-closed)
  //   3. Wrap in try/catch — a failed subscription must NOT block the dashboard
  useEffect(() => {
    if (!userId) return

    const supabase = createClient()
    // Random suffix guarantees a fresh channel object on every mount,
    // even if the previous cleanup hasn't finished unsubscribing yet.
    const channelName = `notif:${userId}:${Math.random().toString(36).slice(2)}`
    let channel: ReturnType<typeof supabase.channel> | null = null

    try {
      // Step 1 — create channel (state = closed)
      channel = supabase.channel(channelName)

      // Step 2 — register listeners (must happen while state = closed)
      channel.on(
        'postgres_changes',
        {
          event:  'INSERT',
          schema: 'public',
          table:  'notifications',
          filter: `user_id=eq.${userId}`,
        },
        payload => {
          const notif = payload.new as AppNotification
          setNotifications(prev => [notif, ...prev.slice(0, 49)])

          // Show browser notification when the panel is closed
          if (
            !openRef.current &&
            typeof window !== 'undefined' &&
            'Notification' in window &&
            window.Notification.permission === 'granted'
          ) {
            new window.Notification(notif.title, {
              body: notif.message || undefined,
              icon: '/logo/logo-icon.jpg',
              tag:  notif.id,
            })
          }
        }
      )

      // Step 3 — subscribe (state transitions closed → joining → joined)
      channel.subscribe((_status, err) => {
        if (err) {
          console.error('[NotificationBell] realtime subscribe error:', err)
        }
      })
    } catch (err) {
      // Realtime failure must never block login or dashboard access
      console.error('[NotificationBell] failed to set up realtime channel:', err)
      channel = null
    }

    return () => {
      if (channel) {
        supabase.removeChannel(channel).catch(() => {})
      }
    }
  }, [userId]) // `open` intentionally omitted — openRef tracks it without re-subscribing

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  const handleOpen = useCallback(() => setOpen(o => !o), [])

  async function handleClickNotification(n: AppNotification) {
    if (!n.is_read) {
      setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, is_read: true } : x))
      await markNotificationRead(n.id)
    }
    if (n.url) {
      setOpen(false)
      window.location.href = n.url
    }
  }

  async function handleMarkAll() {
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    await markAllNotificationsRead()
  }

  if (!mounted) return null

  return (
    <>
      {/* ── Bell trigger ── */}
      <button
        onClick={handleOpen}
        aria-label={`การแจ้งเตือน${unreadCount > 0 ? ` (${unreadCount} ใหม่)` : ''}`}
        className="relative w-9 h-9 flex items-center justify-center rounded-xl transition text-gray-500 hover:bg-gray-100 active:bg-gray-100 flex-shrink-0"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 leading-none pointer-events-none">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* ── Panel portal ── */}
      {open && createPortal(
        <div className="fixed inset-0 z-[60] flex justify-end">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />

          {/* Slide-in panel */}
          <div className="relative h-full w-full sm:w-[420px] bg-white flex flex-col shadow-2xl">

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <Bell className="w-5 h-5 text-gray-700" />
                <h2 className="text-base font-semibold text-gray-900">การแจ้งเตือน</h2>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 bg-red-100 text-red-600 text-xs font-semibold rounded-full">
                    {unreadCount} ใหม่
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAll}
                    className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 px-2 py-1 rounded-lg hover:bg-blue-50 transition"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    อ่านทั้งหมด
                  </button>
                )}
                <Link
                  href="/notifications/settings"
                  onClick={() => setOpen(false)}
                  title="ตั้งค่าการแจ้งเตือน"
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition text-gray-500"
                >
                  <Settings className="w-4 h-4" />
                </Link>
                <button
                  onClick={() => setOpen(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition"
                >
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>
            </div>

            {/* Notification list */}
            <div className="flex-1 min-h-0 overflow-y-auto">
              {loading ? (
                <div className="flex justify-center py-14">
                  <Loader2 className="w-6 h-6 animate-spin text-gray-300" />
                </div>
              ) : notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                  <Bell className="w-12 h-12 mb-3 text-gray-200" />
                  <p className="text-sm font-medium">ยังไม่มีการแจ้งเตือน</p>
                  <p className="text-xs mt-1 text-gray-300">การแจ้งเตือนจะปรากฏที่นี่</p>
                </div>
              ) : (
                <div>
                  {notifications.map((n, i) => {
                    return (
                      <button
                        key={n.id}
                        onClick={() => handleClickNotification(n)}
                        className={`w-full flex items-start gap-3.5 px-5 py-4 text-left transition hover:bg-gray-50 active:bg-gray-100 ${
                          !n.is_read ? 'bg-blue-50/50' : ''
                        } ${i < notifications.length - 1 ? 'border-b border-gray-50' : ''}`}
                      >
                        <span className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center mt-0.5 flex-shrink-0">
                          <NotificationIcon type={n.type} />
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className={`text-sm leading-snug ${
                              !n.is_read
                                ? 'font-semibold text-gray-900'
                                : 'font-medium text-gray-700'
                            }`}>
                              {n.title}
                            </p>
                            {!n.is_read && (
                              <span className="flex-shrink-0 w-2 h-2 rounded-full bg-blue-500 mt-1.5" />
                            )}
                          </div>
                          {n.message && (
                            <p className="text-xs text-gray-500 mt-0.5 leading-relaxed line-clamp-2">
                              {n.message}
                            </p>
                          )}
                          <p className="text-[11px] text-gray-400 mt-1">{timeAgo(n.created_at)}</p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Footer — push notification toggle */}
            {permission !== 'unsupported' && (
              <div className="flex-shrink-0 px-5 py-3.5 border-t border-gray-100 bg-gray-50/60">
                {permission === 'denied' ? (
                  <p className="text-xs text-gray-400 flex items-center gap-1.5">
                    <BellOff className="w-3.5 h-3.5" />
                    การแจ้งเตือน push ถูกปิดในเบราว์เซอร์
                  </p>
                ) : subscribed ? (
                  <button
                    onClick={unsubscribe}
                    disabled={pushLoading}
                    className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-red-600 transition disabled:opacity-50"
                  >
                    {pushLoading
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      : <BellOff className="w-3.5 h-3.5" />
                    }
                    ปิด push notification
                  </button>
                ) : (
                  <button
                    onClick={subscribe}
                    disabled={pushLoading}
                    className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 transition disabled:opacity-50"
                  >
                    {pushLoading
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      : <BellRing className="w-3.5 h-3.5" />
                    }
                    เปิด push notification
                  </button>
                )}
              </div>
            )}
          </div>
        </div>,
        document.body,
      )}
    </>
  )
}
