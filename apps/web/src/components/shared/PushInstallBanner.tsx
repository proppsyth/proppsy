'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Bell, X, Loader2, Smartphone } from 'lucide-react'
import { usePushNotifications } from '@/hooks/usePushNotifications'

const DISMISS_KEY = 'push_banner_dismissed_v1'

export default function PushInstallBanner() {
  const { permission, subscribed, loading, subscribe } = usePushNotifications()
  const [mounted, setMounted] = useState(false)
  const [dismissed, setDismissed] = useState(true)
  const [isIOS, setIsIOS] = useState(false)
  const [standalone, setStandalone] = useState(false)

  useEffect(() => {
    setMounted(true)
    setDismissed(localStorage.getItem(DISMISS_KEY) === '1')
    setIsIOS(/iphone|ipad|ipod/i.test(navigator.userAgent))
    setStandalone(
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true,
    )
  }, [])

  if (!mounted || dismissed || subscribed) return null

  function close() {
    localStorage.setItem(DISMISS_KEY, '1')
    setDismissed(true)
  }

  // iOS Safari (not installed) can't receive push until added to Home Screen.
  const needsInstall = permission === 'unsupported' && isIOS && !standalone
  // Supported but not yet granted → offer to enable directly.
  const canEnable = permission !== 'unsupported' && permission !== 'granted'

  if (!needsInstall && !canEnable) return null

  return (
    <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 mb-4">
      <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
        {needsInstall ? <Smartphone className="w-4 h-4 text-blue-600" /> : <Bell className="w-4 h-4 text-blue-600" />}
      </div>
      <div className="flex-1 min-w-0">
        {needsInstall ? (
          <>
            <p className="text-sm font-medium text-blue-900">ติดตั้งแอปเพื่อรับการแจ้งเตือน</p>
            <p className="text-xs text-blue-700 mt-0.5">
              บน iPhone: กดปุ่มแชร์ → “เพิ่มไปยังหน้าจอโฮม” แล้วเปิดจากไอคอน{' '}
              <Link href="/help" className="underline font-medium">ดูวิธีติดตั้ง</Link>
            </p>
          </>
        ) : (
          <>
            <p className="text-sm font-medium text-blue-900">เปิดการแจ้งเตือน</p>
            <p className="text-xs text-blue-700 mt-0.5">รับแจ้งเตือนมีคนสนใจทรัพย์ · ลงนามสัญญา · ค่าเช่าครบกำหนด แม้ปิดแอป</p>
            <button
              onClick={subscribe}
              disabled={loading}
              className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Bell className="w-3.5 h-3.5" />}
              เปิดการแจ้งเตือน
            </button>
          </>
        )}
      </div>
      <button onClick={close} className="text-blue-400 hover:text-blue-600 flex-shrink-0"><X className="w-4 h-4" /></button>
    </div>
  )
}
