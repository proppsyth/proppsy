'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

type Mode = 'login' | 'forgot'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirect') || '/dashboard'

  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [forgotSent, setForgotSent] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
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
        .from('profiles')
        .select('account_status')
        .eq('id', data.user.id)
        .single()

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

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    setLoading(false)
    if (err) {
      setError('ไม่สามารถส่งอีเมลได้ กรุณาตรวจสอบอีเมลของคุณ')
      return
    }
    setForgotSent(true)
  }

  function switchMode(m: Mode) {
    setMode(m)
    setError('')
    setForgotSent(false)
  }

  // ─── Forgot Password Sent ───
  if (mode === 'forgot' && forgotSent) {
    return (
      <div className="text-center py-4">
        <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl">✉️</span>
        </div>
        <h2 className="text-lg font-semibold text-gray-900 mb-2">ส่งอีเมลแล้ว</h2>
        <p className="text-sm text-gray-500 mb-5">
          ตรวจสอบอีเมล <span className="font-medium text-gray-700">{email}</span><br />
          แล้วคลิกลิงก์เพื่อตั้งรหัสผ่านใหม่
        </p>
        <button onClick={() => switchMode('login')} className="text-sm text-blue-600 hover:underline">
          ← กลับหน้าเข้าสู่ระบบ
        </button>
      </div>
    )
  }

  // ─── Forgot Password Form ───
  if (mode === 'forgot') {
    return (
      <form onSubmit={handleForgot} className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-1">ลืมรหัสผ่าน</h2>
          <p className="text-gray-500 text-sm mb-4">กรอกอีเมลของคุณ เราจะส่งลิงก์รีเซ็ตรหัสผ่านให้</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">อีเมล</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            autoComplete="email"
            placeholder="your@email.com"
            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
          />
        </div>
        {error && (
          <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-600">{error}</div>
        )}
        <button type="submit" disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-medium py-3 rounded-xl transition text-sm">
          {loading ? 'กำลังส่ง...' : 'ส่งลิงก์รีเซ็ตรหัสผ่าน'}
        </button>
        <button type="button" onClick={() => switchMode('login')}
          className="w-full text-sm text-gray-500 hover:text-gray-700 transition py-1">
          ← กลับหน้าเข้าสู่ระบบ
        </button>
      </form>
    )
  }

  // ─── Login Form ───
  return (
    <form onSubmit={handleLogin} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">อีเมล</label>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          autoComplete="email"
          placeholder="your@email.com"
          className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">รหัสผ่าน</label>
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          autoComplete="current-password"
          placeholder="••••••••"
          className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
        />
        <button
          type="button"
          onClick={() => switchMode('forgot')}
          className="block w-full text-right text-xs text-blue-600 hover:text-blue-700 py-2.5 -mb-1"
        >
          ลืมรหัสผ่าน?
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-600">{error}</div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-medium py-3 rounded-xl transition text-sm"
      >
        {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
      </button>
    </form>
  )
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <Image src="/logo/logo.png" alt="Proppsy" width={160} height={56} priority className="object-contain" />
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h1 className="text-2xl font-semibold text-gray-900 mb-1">เข้าสู่ระบบ</h1>
          <p className="text-gray-500 text-sm mb-6">สำหรับเอเจนต์อสังหาริมทรัพย์</p>

          <Suspense fallback={<div className="h-48" />}>
            <LoginForm />
          </Suspense>

          <div className="mt-6 text-center space-y-2">
            <p className="text-sm text-gray-500">
              ยังไม่มีบัญชี?{' '}
              <Link href="/register" className="text-blue-600 hover:underline font-medium">
                ลงทะเบียน
              </Link>
            </p>
            <Link href="/" className="text-xs text-gray-400 hover:text-gray-600 block">
              ← กลับหน้าหลัก
            </Link>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Real Estate Agent Management Platform
        </p>
      </div>
    </div>
  )
}
