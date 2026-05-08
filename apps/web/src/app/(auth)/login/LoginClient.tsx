'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

type Mode = 'login' | 'forgot'

export default function LoginClient({ redirectTo }: { redirectTo: string }) {
  const router = useRouter()

  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [forgotSent, setForgotSent] = useState(false)

  async function handleLogin() {
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password })

    if (authError) {
      setError('อีเมลหรือรหัสผ่านไม่ถูกต้อง')
      setLoading(false)
      return
    }

    if (data.user) {
      const { data: profile } = await supabase
        .from('profiles').select('account_status').eq('id', data.user.id).single()

      if (profile?.account_status === 'pending') {
        setError('บัญชีของคุณยังรอการอนุมัติจากแอดมิน')
        await supabase.auth.signOut()
        setLoading(false)
        return
      }
      if (profile?.account_status === 'rejected') {
        setError('บัญชีของคุณถูกปฏิเสธ กรุณาติดต่อแอดมิน')
        await supabase.auth.signOut()
        setLoading(false)
        return
      }

      router.push(redirectTo)
      router.refresh()
    }
  }

  async function handleForgot() {
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error: err } = await supabase.auth.resetPasswordForEmail(email)
    setLoading(false)
    if (err) { setError('ไม่สามารถส่งอีเมลได้ กรุณาตรวจสอบอีเมลของคุณ'); return }
    setForgotSent(true)
  }

  function switchMode(m: Mode) {
    setMode(m)
    setError('')
    setForgotSent(false)
  }

  // ─── Forgot Sent ───
  if (mode === 'forgot' && forgotSent) {
    return (
      <div className="text-center py-4">
        <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl">✉️</span>
        </div>
        <h2 className="text-lg font-semibold text-gray-900 mb-2">ส่งรหัส OTP แล้ว</h2>
        <p className="text-sm text-gray-500 mb-5">
          ตรวจสอบอีเมล <span className="font-medium text-gray-700">{email}</span><br />
          แล้วนำรหัส OTP ที่ได้รับมากรอกด้านล่าง
        </p>
        <a
          href={`/reset-password?email=${encodeURIComponent(email)}`}
          style={{ touchAction: 'manipulation' }}
          className="block w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-medium py-3.5 rounded-xl text-sm mb-3 text-center"
        >
          กรอกรหัส OTP ตั้งรหัสผ่านใหม่
        </a>
        <button type="button" onClick={() => switchMode('login')} className="text-sm text-gray-500 hover:text-gray-700">
          ← กลับหน้าเข้าสู่ระบบ
        </button>
      </div>
    )
  }

  // ─── Forgot Form ───
  if (mode === 'forgot') {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-1">ลืมรหัสผ่าน</h2>
          <p className="text-gray-500 text-sm mb-4">กรอกอีเมลของคุณ เราจะส่งรหัส OTP ให้</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">อีเมล</label>
          <input
            type="email"
            inputMode="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            autoComplete="email"
            placeholder="your@email.com"
            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        {error && <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-600">{error}</div>}
        <button
          type="button"
          onClick={handleForgot}
          disabled={loading}
          style={{ touchAction: 'manipulation' }}
          className="w-full bg-blue-600 active:bg-blue-800 disabled:bg-blue-300 text-white font-medium py-3.5 rounded-xl text-sm"
        >
          {loading ? 'กำลังส่ง...' : 'ส่งรหัส OTP ทางอีเมล'}
        </button>
        <button type="button" onClick={() => switchMode('login')} className="w-full text-sm text-gray-500 hover:text-gray-700 py-1">
          ← กลับหน้าเข้าสู่ระบบ
        </button>
      </div>
    )
  }

  // ─── Login Form ───
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">อีเมล</label>
        <input
          type="email"
          inputMode="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          autoComplete="email"
          placeholder="your@email.com"
          className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">รหัสผ่าน</label>
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          autoComplete="current-password"
          placeholder="••••••••"
          className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <button
          type="button"
          onClick={() => switchMode('forgot')}
          style={{ touchAction: 'manipulation' }}
          className="block w-full text-right text-xs text-blue-600 hover:text-blue-700 py-2.5 -mb-1"
        >
          ลืมรหัสผ่าน?
        </button>
      </div>
      {error && <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-600">{error}</div>}
      <button
        type="button"
        onClick={handleLogin}
        disabled={loading}
        style={{ touchAction: 'manipulation' }}
        className="w-full bg-blue-600 active:bg-blue-800 disabled:bg-blue-300 text-white font-medium py-3.5 rounded-xl text-sm"
      >
        {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
      </button>
    </div>
  )
}
