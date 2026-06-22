'use client'

import { useState, useTransition } from 'react'
import { CheckCircle2, Loader2 } from 'lucide-react'
import { NOTIF_CATEGORIES } from '@/lib/notifications/categories'
import { saveNotificationPrefs } from '../actions'

export default function NotificationSettings({ initialPrefs }: { initialPrefs: Record<string, boolean> }) {
  const [prefs, setPrefs] = useState<Record<string, boolean>>(initialPrefs)
  const [saved, setSaved] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [, start] = useTransition()

  // A category is ON unless explicitly false.
  const isOn = (k: string) => prefs[k] !== false

  function toggle(k: string) {
    const next = { ...prefs, [k]: !isOn(k) }
    setPrefs(next)
    setSaved(false); setErr(null)
    start(async () => {
      const res = await saveNotificationPrefs(next)
      if (res.error) setErr(res.error)
      else { setSaved(true); setTimeout(() => setSaved(false), 1500) }
    })
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm divide-y divide-gray-100">
      {NOTIF_CATEGORIES.map(c => (
        <div key={c.key} className="flex items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-800">{c.label}</p>
            <p className="text-xs text-gray-400">{c.desc}</p>
          </div>
          <button
            type="button"
            onClick={() => toggle(c.key)}
            className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${isOn(c.key) ? 'bg-green-500' : 'bg-gray-200'}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${isOn(c.key) ? 'translate-x-5' : ''}`} />
          </button>
        </div>
      ))}
      <div className="px-4 py-2.5 flex items-center gap-2 text-xs">
        {err ? <span className="text-red-600">{err}</span>
          : saved ? <span className="flex items-center gap-1 text-green-600"><CheckCircle2 className="w-3.5 h-3.5" /> บันทึกแล้ว</span>
          : <span className="flex items-center gap-1 text-gray-400"><Loader2 className="w-3 h-3" /> บันทึกอัตโนมัติเมื่อสลับ</span>}
      </div>
    </div>
  )
}
