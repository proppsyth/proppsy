'use client'

import { useState, useTransition } from 'react'
import Script from 'next/script'
import { CreditCard, Check, ShieldCheck } from 'lucide-react'
import { createOmiseCharge } from './actions'

declare global {
  interface Window {
    OmiseCard: {
      configure: (opts: Record<string, unknown>) => void
      open: (opts: {
        frameLabel: string
        submitLabel: string
        currency: string
        amount: number
        onCreateTokenSuccess: (token: string) => void
        onFormClosed: () => void
      }) => void
    }
  }
}

const PLAN_FEATURES = {
  professional: ['ทรัพย์ไม่จำกัด', 'สัญญาไม่จำกัด', 'AI Smart Paste', 'AI OCR บัตรประชาชน', 'PDF สัญญา 9 ประเภท', 'ลายเซ็นอิเล็กทรอนิกส์'],
  business: ['ทุกอย่างใน Professional', 'สูงสุด 5 บัญชีเอเจนต์', 'บัญชีผู้จัดการทีม', 'รายงานภาพรวมทีม', 'คอมมิชชันแยกรายเอเจนต์', 'Priority Support'],
}

interface Props {
  plan: 'professional' | 'business'
  billing: 'monthly' | 'yearly'
  amount: number
  planName: string
}

export default function CheckoutForm({ plan, billing, amount, planName }: Props) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [ready, setReady] = useState(false)

  function handlePay() {
    const pubKey = process.env.NEXT_PUBLIC_OMISE_PUBLIC_KEY
    if (!pubKey || !window.OmiseCard) return
    setError('')
    window.OmiseCard.configure({ publicKey: pubKey })
    window.OmiseCard.open({
      frameLabel: 'Proppsy',
      submitLabel: `ชำระ ฿${amount.toLocaleString('th-TH')}`,
      currency: 'THB',
      amount: amount * 100,
      onCreateTokenSuccess: (token) => {
        startTransition(async () => {
          const res = await createOmiseCharge({ plan, billing, token })
          if (res.error) setError(res.error)
          else setSuccess(true)
        })
      },
      onFormClosed: () => {},
    })
  }

  if (success) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Check className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">ชำระเงินสำเร็จ!</h2>
        <p className="text-gray-500 text-sm mb-6">แพ็กเกจ {planName} เปิดใช้งานแล้ว</p>
        <a
          href="/dashboard"
          className="inline-block px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition"
        >
          ไปที่ Dashboard
        </a>
      </div>
    )
  }

  const savings = billing === 'yearly'
    ? Math.round((1 - amount / ((plan === 'professional' ? 990 : 2990) * 12)) * 100)
    : 0

  return (
    <>
      <Script src="https://cdn.omise.co/omise.js" onReady={() => setReady(true)} />

      {/* Order summary */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-4">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="font-bold text-gray-900 text-lg">{planName}</h3>
            <p className="text-xs text-gray-400">{billing === 'yearly' ? 'ชำระรายปี' : 'ชำระรายเดือน'}</p>
          </div>
          {savings > 0 && (
            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
              ประหยัด {savings}%
            </span>
          )}
        </div>

        <ul className="space-y-1.5 mb-4">
          {PLAN_FEATURES[plan].map(f => (
            <li key={f} className="flex items-center gap-2 text-xs text-gray-600">
              <Check className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
              {f}
            </li>
          ))}
        </ul>

        <div className="border-t border-gray-100 pt-3 flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">ยอดชำระ</span>
          <div className="text-right">
            <span className="text-2xl font-bold text-blue-600">฿{amount.toLocaleString('th-TH')}</span>
            <span className="text-xs text-gray-400 ml-1">/{billing === 'yearly' ? 'ปี' : 'เดือน'}</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-600 mb-4">
          {error}
        </div>
      )}

      <button
        onClick={handlePay}
        disabled={pending || !ready}
        className="w-full flex items-center justify-center gap-2 py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold rounded-xl transition text-sm"
      >
        <CreditCard className="w-5 h-5" />
        {pending ? 'กำลังดำเนินการ...' : !ready ? 'กำลังโหลด...' : `ชำระด้วยบัตรเครดิต ฿${amount.toLocaleString('th-TH')}`}
      </button>

      <div className="flex items-center justify-center gap-1.5 mt-3">
        <ShieldCheck className="w-3.5 h-3.5 text-gray-400" />
        <p className="text-xs text-gray-400">ชำระเงินผ่าน Omise · ปลอดภัยด้วย SSL 256-bit · ไม่เก็บข้อมูลบัตร</p>
      </div>
    </>
  )
}
