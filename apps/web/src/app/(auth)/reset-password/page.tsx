'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) {
      setError('รหัสผ่านไม่ตรงกัน')
      return
    }
    if (password.length < 6) {
      setError('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร')
      return
    }
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error: err } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (err) {
      setError('ไม่สามารถเปลี่ยนรหัสผ่านได้: ' + err.message)
      return
    }
    router.push('/login?reset=success')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <Image src="/logo/logo-icon.jpg" alt="Proppsy" width={60} height={60} priority className="object-contain rounded-2xl" />
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h1 className="text-2xl font-semibold text-gray-900 mb-1">ตั้งรหัสผ่านใหม่</h1>
          <p className="text-gray-500 text-sm mb-6">กรอกรหัสผ่านใหม่ของคุณ</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">รหัสผ่านใหม่</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ยืนยันรหัสผ่านใหม่</label>
              <input
                type="password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                required
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
              {loading ? 'กำลังบันทึก...' : 'ตั้งรหัสผ่านใหม่'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link href="/login" className="text-sm text-gray-500 hover:text-gray-700 transition">
              ← กลับหน้าเข้าสู่ระบบ
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
