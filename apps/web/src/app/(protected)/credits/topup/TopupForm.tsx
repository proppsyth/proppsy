'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Zap, Loader2, CheckCircle2 } from 'lucide-react'
import { createCreditTopup } from '@/lib/credits/actions'
import { TOPUP_PACKAGES } from '@/lib/credits/constants'

declare global {
  interface Window {
    Omise?: {
      setPublicKey: (key: string) => void
      createToken: (
        type: string,
        data: Record<string, string>,
        callback: (status: number, response: { id?: string; message?: string }) => void
      ) => void
    }
  }
}

interface Props {
  currentBalance: number
}

export default function TopupForm({ currentBalance }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const defaultCredits = parseInt(searchParams.get('credits') ?? '10', 10)

  const [selected, setSelected] = useState(
    TOPUP_PACKAGES.find(p => p.credits === defaultCredits) ?? TOPUP_PACKAGES[0]!
  )
  const [cardNumber, setCardNumber] = useState('')
  const [expiry, setExpiry] = useState('')
  const [cvv, setCvv] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [newBalance, setNewBalance] = useState(currentBalance)
  const omiseReady = useRef(false)

  useEffect(() => {
    if (omiseReady.current) return
    const script = document.createElement('script')
    script.src = 'https://cdn.omise.co/omise.js'
    script.onload = () => {
      window.Omise?.setPublicKey(process.env.NEXT_PUBLIC_OMISE_PUBLIC_KEY ?? '')
      omiseReady.current = true
    }
    document.head.appendChild(script)
  }, [])

  function formatCardNumber(v: string) {
    return v.replace(/\D/g, '').slice(0, 16).replace(/(\d{4})/g, '$1 ').trim()
  }
  function formatExpiry(v: string) {
    const digits = v.replace(/\D/g, '').slice(0, 4)
    return digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!window.Omise) { setError('ระบบชำระเงินยังโหลดไม่สำเร็จ กรุณารีเฟรช'); return }
    setLoading(true)
    setError('')

    const [expMonth, expYear] = expiry.split('/')
    window.Omise.createToken('card', {
      name,
      number: cardNumber.replace(/\s/g, ''),
      expiration_month: expMonth ?? '',
      expiration_year: `20${expYear ?? ''}`,
      security_code: cvv,
    }, async (status, resp) => {
      if (status !== 200 || !resp.id) {
        setError(resp.message ?? 'บัตรไม่ถูกต้อง')
        setLoading(false)
        return
      }
      const result = await createCreditTopup({ credits: selected.credits, token: resp.id })
      setLoading(false)
      if (result.error) { setError(result.error); return }
      setNewBalance(result.balance ?? currentBalance + selected.credits)
      setSuccess(true)
      setTimeout(() => router.push('/credits'), 2500)
    })
  }

  if (success) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center space-y-4 animate-celebrate">
        <CheckCircle2 className="w-14 h-14 text-green-500 mx-auto" />
        <div>
          <p className="text-lg font-bold text-gray-900">เติมเครดิตสำเร็จ!</p>
          <p className="text-sm text-gray-500 mt-1">
            เครดิตปัจจุบัน: <span className="font-bold text-gray-900 tabular-nums">{newBalance}</span>
          </p>
        </div>
        <p className="text-xs text-gray-400">กำลังนำไปหน้าเครดิต...</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Package selection */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">เลือกจำนวนเครดิต</h2>
        <div className="space-y-2">
          {TOPUP_PACKAGES.map(pkg => (
            <button
              key={pkg.credits}
              type="button"
              onClick={() => setSelected(pkg)}
              className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                selected.credits === pkg.credits
                  ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                  : 'border-gray-100 bg-gray-50 hover:border-gray-200'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  selected.credits === pkg.credits ? 'bg-blue-600' : 'bg-gray-200'
                }`}>
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <div className="text-left">
                  <p className="font-bold text-gray-900">{pkg.credits} เครดิต</p>
                  <p className="text-xs text-gray-500">
                    {(pkg.price / pkg.credits).toFixed(0)} บาท / เครดิต
                  </p>
                </div>
              </div>
              <p className="text-sm font-bold text-gray-700 tabular-nums">
                {pkg.price.toLocaleString()} ฿
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Card form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-700">ข้อมูลบัตรเครดิต</h2>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">ชื่อบนบัตร</label>
            <input
              required
              value={name}
              onChange={e => setName(e.target.value.toUpperCase())}
              placeholder="JOHN DOE"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition uppercase"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">หมายเลขบัตร</label>
            <input
              required
              inputMode="numeric"
              value={cardNumber}
              onChange={e => setCardNumber(formatCardNumber(e.target.value))}
              placeholder="0000 0000 0000 0000"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition tabular-nums tracking-wider"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">วันหมดอายุ</label>
              <input
                required
                inputMode="numeric"
                value={expiry}
                onChange={e => setExpiry(formatExpiry(e.target.value))}
                placeholder="MM/YY"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">CVV</label>
              <input
                required
                inputMode="numeric"
                value={cvv}
                onChange={e => setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="000"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              />
            </div>
          </div>
        </div>

        {error && (
          <p className="text-xs text-red-500 bg-red-50 border border-red-100 px-3.5 py-2.5 rounded-xl">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:bg-gray-200 disabled:text-gray-400 text-white text-sm font-bold rounded-xl transition flex items-center justify-center gap-2"
        >
          {loading ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> กำลังชำระ...</>
          ) : (
            `ชำระ ${selected.price.toLocaleString()} บาท (${selected.credits} เครดิต)`
          )}
        </button>

        <p className="text-center text-xs text-gray-400">
          ชำระผ่าน Omise · ปลอดภัยด้วย SSL
        </p>
      </form>
    </div>
  )
}
