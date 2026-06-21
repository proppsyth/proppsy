'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, CheckCircle2, XCircle, Link2, Link2Off, RefreshCw } from 'lucide-react'
import { connectLineOa, testLineConnection, disconnectLineOa, setLineEnabled } from './actions'

interface Props {
  connected: boolean
  enabled: boolean
  botDisplayName: string | null
  botBasicId: string | null
}

export default function LineConnectPanel({ connected, enabled, botDisplayName, botBasicId }: Props) {
  const router = useRouter()
  const [token, setToken] = useState('')
  const [secret, setSecret] = useState('')
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [confirmDisconnect, setConfirmDisconnect] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleConnect() {
    setMsg(null)
    startTransition(async () => {
      const res = await connectLineOa({ channelAccessToken: token, channelSecret: secret })
      if (res.error) { setMsg({ ok: false, text: res.error }); return }
      setMsg({ ok: true, text: `เชื่อมต่อสำเร็จ: ${res.botDisplayName ?? 'LINE OA'}` })
      setToken(''); setSecret('')
      router.refresh()
    })
  }

  function handleTest() {
    setMsg(null)
    startTransition(async () => {
      const res = await testLineConnection()
      if (res.error) { setMsg({ ok: false, text: res.error }); return }
      setMsg({ ok: true, text: `เชื่อมต่อปกติ: ${res.botDisplayName ?? 'LINE OA'}` })
    })
  }

  function handleToggle() {
    startTransition(async () => {
      await setLineEnabled(!enabled)
      router.refresh()
    })
  }

  function handleDisconnect() {
    startTransition(async () => {
      const res = await disconnectLineOa()
      if (res.error) { setMsg({ ok: false, text: res.error }); return }
      setConfirmDisconnect(false)
      router.refresh()
    })
  }

  if (connected) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-3">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-green-600" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-800">{botDisplayName ?? 'LINE OA'}</p>
            {botBasicId && <p className="text-xs text-gray-400">{botBasicId}</p>}
          </div>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
            {enabled ? 'เปิดใช้งาน' : 'ปิดอยู่'}
          </span>
        </div>

        {msg && (
          <div className={`flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg ${msg.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {msg.ok ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
            {msg.text}
          </div>
        )}

        <div className="flex flex-wrap gap-2 pt-1">
          <button onClick={handleTest} disabled={isPending}
            className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 hover:bg-gray-50 text-gray-600 text-sm rounded-lg transition disabled:opacity-50">
            {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            ทดสอบการเชื่อมต่อ
          </button>
          <button onClick={handleToggle} disabled={isPending}
            className="px-3 py-2 border border-gray-200 hover:bg-gray-50 text-gray-600 text-sm rounded-lg transition disabled:opacity-50">
            {enabled ? 'ปิดใช้งานชั่วคราว' : 'เปิดใช้งาน'}
          </button>
          {confirmDisconnect ? (
            <span className="flex items-center gap-2">
              <button onClick={handleDisconnect} disabled={isPending}
                className="flex items-center gap-1.5 px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg transition disabled:opacity-50">
                <Link2Off className="w-3.5 h-3.5" /> ยืนยันตัดการเชื่อมต่อ
              </button>
              <button onClick={() => setConfirmDisconnect(false)} className="text-sm text-gray-400">ยกเลิก</button>
            </span>
          ) : (
            <button onClick={() => setConfirmDisconnect(true)}
              className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 hover:bg-red-50 hover:text-red-600 text-gray-500 text-sm rounded-lg transition">
              <Link2Off className="w-3.5 h-3.5" /> ตัดการเชื่อมต่อ
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-3">
      <p className="text-sm font-semibold text-gray-800">เชื่อมต่อ LINE OA ของคุณ</p>
      <p className="text-xs text-gray-500">
        วาง Channel access token และ Channel secret จาก LINE Developers Console ดูวิธีหาได้ในคู่มือด้านล่าง
      </p>

      <div className="space-y-2.5">
        <div>
          <label className="block text-xs text-gray-500 mb-1 font-medium">Channel access token (long-lived)</label>
          <textarea value={token} onChange={e => setToken(e.target.value)} rows={2}
            placeholder="วาง token ที่นี่"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1 font-medium">Channel secret</label>
          <input value={secret} onChange={e => setSecret(e.target.value)}
            placeholder="วาง channel secret ที่นี่"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
      </div>

      {msg && (
        <div className={`flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg ${msg.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {msg.ok ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
          {msg.text}
        </div>
      )}

      <button onClick={handleConnect} disabled={isPending || !token.trim() || !secret.trim()}
        className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition disabled:opacity-40">
        {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
        {isPending ? 'กำลังตรวจสอบ...' : 'เชื่อมต่อ & ทดสอบ'}
      </button>
    </div>
  )
}
