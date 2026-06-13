'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type Mode = 'login' | 'forgot'

export default function LoginClient({ redirectTo }: { redirectTo: string }) {
  const router = useRouter()

  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [mounted, setMounted] = useState(false)
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
        .from('profiles').select('account_status, deleted_at').eq('id', data.user.id).single()

      if (profile?.deleted_at) {
        setError('บัญชีนี้ถูกปิดการใช้งาน กรุณาติดต่อผู้ดูแลระบบ')
        await supabase.auth.signOut()
        setLoading(false)
        return
      }

      if (profile?.account_status === 'rejected') {
        setError('บัญชีของคุณถูกปฏิเสธ กรุณาติดต่อผู้ดูแลระบบ')
        await supabase.auth.signOut()
        setLoading(false)
        return
      }

      router.push(redirectTo)
      router.refresh()
    }
  }

  async function handleGoogleLogin() {
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: { prompt: 'select_account' },
      },
    })
    if (error) {
      setError('ไม่สามารถเข้าสู่ระบบด้วย Google ได้')
      setLoading(false)
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

  useEffect(() => { setMounted(true) }, [])

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
        {mounted ? (
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="current-password"
              placeholder="••••••••"
              className="w-full px-4 py-3 pr-11 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              type="button"
              onClick={() => setShowPassword(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        ) : (
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoComplete="current-password"
            placeholder="••••••••"
            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        )}
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
      <div className="relative flex items-center">
        <div className="flex-1 border-t border-gray-200" />
        <span className="px-3 text-xs text-gray-400">หรือ</span>
        <div className="flex-1 border-t border-gray-200" />
      </div>
      <button
        type="button"
        onClick={handleGoogleLogin}
        disabled={loading}
        style={{ touchAction: 'manipulation' }}
        className="w-full flex items-center justify-center gap-2.5 bg-white border border-gray-200 hover:bg-gray-50 active:bg-gray-100 disabled:opacity-50 text-gray-700 font-medium py-3.5 rounded-xl text-sm"
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
          <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" fill="#34A853"/>
          <path d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.175 0 7.548 0 9s.348 2.825.957 4.039l3.007-2.332z" fill="#FBBC05"/>
          <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
        </svg>
        เข้าสู่ระบบด้วย Google
      </button>
    </div>
  )
}
