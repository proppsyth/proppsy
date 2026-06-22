'use client'

import { useState, useTransition } from 'react'
import { Megaphone, Loader2, CheckCircle2, XCircle, Play } from 'lucide-react'
import { broadcastAnnouncement, runCronNow } from './actions'

export default function NotifyAdminClient() {
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [url, setUrl] = useState('')
  const [bMsg, setBMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [confirm, setConfirm] = useState(false)
  const [cronOut, setCronOut] = useState<string | null>(null)
  const [pending, start] = useTransition()
  const [cronPending, startCron] = useTransition()

  function send() {
    setBMsg(null)
    start(async () => {
      const res = await broadcastAnnouncement({ title, message, url })
      if (res.error) setBMsg({ ok: false, text: res.error })
      else {
        setBMsg({ ok: true, text: `ส่งถึงผู้ใช้ ${res.sent} คนแล้ว` })
        setTitle(''); setMessage(''); setUrl(''); setConfirm(false)
      }
    })
  }

  function testCron() {
    setCronOut(null)
    startCron(async () => {
      const res = await runCronNow()
      setCronOut(res.error ? `error: ${res.error}` : (res.result ?? ''))
    })
  }

  return (
    <div className="space-y-5">
      {/* Broadcast */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Megaphone className="w-4 h-4 text-blue-600" />
          <h2 className="text-sm font-semibold text-gray-800">ส่งประกาศถึงผู้ใช้ทุกคน</h2>
        </div>
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="หัวข้อ *"
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <textarea value={message} onChange={e => setMessage(e.target.value)} rows={3} placeholder="ข้อความ"
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <input value={url} onChange={e => setUrl(e.target.value)} placeholder="ลิงก์ (ไม่บังคับ) เช่น /news/123 หรือ https://..."
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500" />

        {bMsg && (
          <div className={`flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg ${bMsg.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {bMsg.ok ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}{bMsg.text}
          </div>
        )}

        {confirm ? (
          <div className="flex items-center gap-2">
            <button onClick={send} disabled={pending || !title.trim()}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg disabled:opacity-40">
              {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Megaphone className="w-4 h-4" />} ยืนยันส่งถึงทุกคน
            </button>
            <button onClick={() => setConfirm(false)} className="text-sm text-gray-400">ยกเลิก</button>
          </div>
        ) : (
          <button onClick={() => setConfirm(true)} disabled={!title.trim()}
            className="px-4 py-2 border border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100 text-sm font-medium rounded-lg disabled:opacity-40">
            ส่งประกาศ
          </button>
        )}
      </div>

      {/* Test cron */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-3">
        <h2 className="text-sm font-semibold text-gray-800">ทดสอบ Cron รายวัน</h2>
        <p className="text-xs text-gray-500">รัน /api/cron/line-reminders ทันที (ส่งค่าเช่า/หมดสัญญา/นัดหมาย/แพคเกจ + เคลียร์เอกสารยกเลิกเกิน 30 วัน)</p>
        <button onClick={testCron} disabled={cronPending}
          className="flex items-center gap-1.5 px-4 py-2 border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg disabled:opacity-50">
          {cronPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />} รัน Cron เดี๋ยวนี้
        </button>
        {cronOut && (
          <pre className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs text-gray-700 whitespace-pre-wrap break-all">{cronOut}</pre>
        )}
      </div>
    </div>
  )
}
