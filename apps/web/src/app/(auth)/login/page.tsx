'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') || '/dashboard'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
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
        .select('account_status, role')
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

      router.push(redirect)
      router.refresh()
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
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
        <div className="flex items-center justify-between mb-1">
          <label className="block text-sm font-medium text-gray-700">รหัสผ่าน</label>
          <Link href="/forgot-password" className="text-xs text-blue-600 hover:underline">ลืมรหัสผ่าน?</Link>
        </div>
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          autoComplete="current-password"
          placeholder="••••••••"
          className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
        />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-600">
          {error}
        </div>
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
          <Image
            src="/logo/logo.png"
            alt="Proppsy"
            width={160}
            height={56}
            priority
            className="object-contain"
          />
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
                สมัครเป็นเอเจนต์
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
