'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Step = 1 | 2 | 3

export default function RegisterPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    company_name: '',
    position: '',
  })

  function update(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [field]: e.target.value }))
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (form.password !== form.confirmPassword) {
      setError('รหัสผ่านไม่ตรงกัน')
      return
    }
    if (form.password.length < 8) {
      setError('รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร')
      return
    }

    setLoading(true)
    const supabase = createClient()

    const { error: signUpError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: {
          name: form.name,
          phone: form.phone,
          company_name: form.company_name,
          position: form.position,
        },
      },
    })

    if (signUpError) {
      if (signUpError.message.includes('already registered')) {
        setError('อีเมลนี้ถูกใช้งานแล้ว')
      } else {
        setError(signUpError.message)
      }
      setLoading(false)
      return
    }

    setStep(3)
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Image src="/logo/logo.png" alt="Proppsy" width={140} height={50} priority className="object-contain" />
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">

          {/* Step indicator */}
          <div className="flex items-center gap-2 mb-6">
            {[1, 2, 3].map(s => (
              <div key={s} className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition ${
                  step >= s ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-400'
                }`}>{s}</div>
                {s < 3 && <div className={`h-0.5 w-8 transition ${step > s ? 'bg-blue-600' : 'bg-gray-200'}`} />}
              </div>
            ))}
            <span className="ml-2 text-xs text-gray-400">
              {step === 1 ? 'ข้อมูลทั่วไป' : step === 2 ? 'ยืนยัน' : 'สำเร็จ'}
            </span>
          </div>

          {/* Step 1: Form */}
          {step === 1 && (
            <form onSubmit={e => { e.preventDefault(); setStep(2) }} className="space-y-4">
              <h1 className="text-xl font-semibold text-gray-900 mb-4">สมัครเป็นเอเจนต์</h1>

              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">ชื่อ-นามสกุล *</label>
                  <input type="text" value={form.name} onChange={update('name')} required
                    placeholder="ชื่อ นามสกุล"
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">อีเมล *</label>
                  <input type="email" value={form.email} onChange={update('email')} required
                    placeholder="your@email.com"
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">รหัสผ่าน *</label>
                  <input type="password" value={form.password} onChange={update('password')} required minLength={8}
                    placeholder="อย่างน้อย 8 ตัว"
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">ยืนยันรหัสผ่าน *</label>
                  <input type="password" value={form.confirmPassword} onChange={update('confirmPassword')} required
                    placeholder="••••••••"
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">เบอร์โทร *</label>
                  <input type="tel" value={form.phone} onChange={update('phone')} required
                    placeholder="08x-xxx-xxxx"
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">ตำแหน่ง</label>
                  <input type="text" value={form.position} onChange={update('position')}
                    placeholder="เช่น Agent, Broker"
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">ชื่อบริษัท / ทีม</label>
                  <input type="text" value={form.company_name} onChange={update('company_name')}
                    placeholder="ชื่อบริษัทหรือทีม"
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-600">{error}</div>
              )}

              <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-xl text-sm transition">
                ถัดไป →
              </button>
            </form>
          )}

          {/* Step 2: Confirm */}
          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">ยืนยันข้อมูล</h2>
              <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
                <Row label="ชื่อ" value={form.name} />
                <Row label="อีเมล" value={form.email} />
                <Row label="เบอร์โทร" value={form.phone} />
                {form.company_name && <Row label="บริษัท" value={form.company_name} />}
                {form.position && <Row label="ตำแหน่ง" value={form.position} />}
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">
                หลังสมัคร บัญชีจะอยู่ในสถานะ &ldquo;รอการอนุมัติ&rdquo; แอดมินจะตรวจสอบและแจ้งผลทางอีเมล
              </p>
              {error && (
                <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-600">{error}</div>
              )}
              <div className="flex gap-3">
                <button onClick={() => setStep(1)} className="flex-1 border border-gray-200 text-gray-600 font-medium py-3 rounded-xl text-sm hover:bg-gray-50 transition">
                  ← แก้ไข
                </button>
                <button onClick={handleRegister} disabled={loading}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-medium py-3 rounded-xl text-sm transition">
                  {loading ? 'กำลังสมัคร...' : 'ยืนยันสมัคร'}
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Success */}
          {step === 3 && (
            <div className="text-center space-y-4 py-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900">สมัครสำเร็จ!</h2>
              <p className="text-sm text-gray-500 leading-relaxed">
                กรุณาตรวจสอบอีเมล <strong>{form.email}</strong> เพื่อยืนยันบัญชี<br />
                จากนั้นรอแอดมินอนุมัติก่อนเข้าใช้งาน
              </p>
              <button onClick={() => router.push('/login')}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-xl text-sm transition">
                ไปหน้าเข้าสู่ระบบ
              </button>
            </div>
          )}

          {step < 3 && (
            <p className="mt-6 text-center text-sm text-gray-500">
              มีบัญชีแล้ว?{' '}
              <Link href="/login" className="text-blue-600 hover:underline font-medium">เข้าสู่ระบบ</Link>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-gray-800">{value}</span>
    </div>
  )
}
