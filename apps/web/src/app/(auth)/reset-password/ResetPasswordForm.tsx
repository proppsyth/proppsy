'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function ResetPasswordForm({ initialEmail }: { initialEmail: string }) {
  const [step, setStep] = useState<'verify' | 'success'>('verify')
  const [email, setEmail] = useState(initialEmail)
  const [token, setToken] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit() {
    setError('')
    if (!email.trim()) { setError('กรุณากรอกอีเมล'); return }
    if (!token.trim()) { setError('กรุณากรอกรหัส OTP'); return }
    if (password.length < 6) { setError('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร'); return }
    if (password !== confirm) { setError('รหัสผ่านไม่ตรงกัน'); return }

    setLoading(true)
    const supabase = createClient()

    const { error: verifyErr } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: token.trim(),
      type: 'recovery',
    })

    if (verifyErr) {
      setError('รหัส OTP ไม่ถูกต้องหรือหมดอายุแล้ว กรุณาขอรหัสใหม่')
      setLoading(false)
      return
    }

    const { error: updateErr } = await supabase.auth.updateUser({ password })
    setLoading(false)

    if (updateErr) {
      setError('ไม่สามารถตั้งรหัสผ่านใหม่ได้: ' + updateErr.message)
      return
    }

    await supabase.auth.signOut()
    setStep('success')
  }

  if (step === 'success') {
    return (
      <div className="text-center py-4">
        <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl">✅</span>
        </div>
        <h2 className="text-lg font-semibold text-gray-900 mb-2">ตั้งรหัสผ่านใหม่สำเร็จ</h2>
        <p className="text-sm text-gray-500 mb-6">กลับไปเข้าสู่ระบบด้วยรหัสผ่านใหม่ของคุณ</p>
        <Link href="/login"
          className="block w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-xl text-sm text-center">
          ไปหน้าเข้าสู่ระบบ
        </Link>
      </div>
    )
  }

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
        <label className="block text-sm font-medium text-gray-700 mb-1">รหัส OTP จากอีเมล</label>
        <input
          type="text"
          inputMode="numeric"
          value={token}
          onChange={e => setToken(e.target.value.trim())}
          placeholder="12345678"
          className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm text-center tracking-[0.3em] font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <p className="text-xs text-gray-400 mt-1">กรอกรหัส OTP จากอีเมล (ไม่ต้องเว้นวรรค)</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">รหัสผ่านใหม่</label>
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          autoComplete="new-password"
          placeholder="••••••••"
          className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">ยืนยันรหัสผ่านใหม่</label>
        <input
          type="password"
          value={confirm}
          onChange={e => setConfirm(e.target.value)}
          autoComplete="new-password"
          placeholder="••••••••"
          className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={loading}
        style={{ touchAction: 'manipulation' }}
        className="w-full bg-blue-600 active:bg-blue-800 disabled:bg-blue-300 text-white font-semibold py-4 rounded-xl text-sm"
      >
        {loading ? 'กำลังตรวจสอบ...' : 'ตั้งรหัสผ่านใหม่'}
      </button>

      <Link href="/login" className="block text-center text-sm text-gray-500 py-1">
        ← กลับหน้าเข้าสู่ระบบ
      </Link>
    </div>
  )
}
