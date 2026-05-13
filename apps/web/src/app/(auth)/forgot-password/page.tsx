'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { checkEmailExists } from './actions'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { exists } = await checkEmailExists(email)
    if (!exists) {
      setError('ไม่พบอีเมลนี้ในระบบ กรุณาตรวจสอบอีเมลของคุณ')
      setLoading(false)
      return
    }

    const supabase = createClient()
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    setLoading(false)
    if (err) {
      setError('ไม่สามารถส่งอีเมลได้ กรุณาตรวจสอบอีเมลของคุณ')
      return
    }
    setSent(true)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <Image src="/logo/logo-icon.jpg" alt="Proppsy" width={60} height={60} priority className="object-contain rounded-2xl" />
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          {sent ? (
            <div className="text-center">
              <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">✉️</span>
              </div>
              <h1 className="text-xl font-semibold text-gray-900 mb-2">ส่งอีเมลแล้ว</h1>
              <p className="text-sm text-gray-500 mb-6">
                กรุณาตรวจสอบอีเมล <span className="font-medium text-gray-700">{email}</span><br />
                แล้วคลิกลิงก์เพื่อตั้งรหัสผ่านใหม่
              </p>
              <Link href="/login" className="text-sm text-blue-600 hover:underline">
                ← กลับหน้าเข้าสู่ระบบ
              </Link>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-semibold text-gray-900 mb-1">ลืมรหัสผ่าน</h1>
              <p className="text-gray-500 text-sm mb-6">กรอกอีเมลของคุณ เราจะส่งลิงก์ตั้งรหัสผ่านใหม่ให้</p>

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
                  {loading ? 'กำลังส่ง...' : 'ส่งลิงก์รีเซ็ตรหัสผ่าน'}
                </button>
              </form>

              <div className="mt-6 text-center">
                <Link href="/login" className="text-sm text-gray-500 hover:text-gray-700 transition">
                  ← กลับหน้าเข้าสู่ระบบ
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
