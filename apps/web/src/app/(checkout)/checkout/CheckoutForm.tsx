'use client'

import { useState, useTransition, useEffect } from 'react'
import Script from 'next/script'
import { CreditCard, Check, ShieldCheck, QrCode, Loader2, Star } from 'lucide-react'
import { createOmiseCharge, createPromptPayCharge, pollAndActivate, chargeWithSavedCard } from './actions'
import type { Plan } from './actions'
import type { SavedCard } from '@/app/(protected)/billing/actions'

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

const PLAN_FEATURES: Record<string, string[]> = {
  professional: [
    'ทรัพย์ไม่จำกัด',
    'สัญญาไม่จำกัด',
    'AI Smart Paste',
    'AI OCR บัตรประชาชน',
    'PDF สัญญาภาษาไทยครบชุด (9 ประเภท)',
    'Marketplace listing',
    'ลายเซ็นอิเล็กทรอนิกส์',
    'รายงานคอมมิชชัน',
  ],
  business: [
    'ทุกอย่างใน Professional',
    'สูงสุด 5 บัญชีเอเจนต์',
    'บัญชีผู้จัดการทีม (Manager)',
    'รายงานภาพรวมทีม',
    'คอมมิชชันแยกรายเอเจนต์',
    'Priority Support',
  ],
}

interface Props {
  plan: Plan
  billing: 'monthly' | 'yearly'
  amount: number
  planName: string
  savedCards?: SavedCard[]
}

const BRAND_COLORS: Record<string, string> = {
  Visa: 'text-blue-700',
  Mastercard: 'text-red-600',
  JCB: 'text-green-700',
  'American Express': 'text-blue-500',
}

export default function CheckoutForm({ plan, billing, amount, planName, savedCards = [] }: Props) {
  const [pending, startTransition] = useTransition()
  const [qrPending, startQr] = useTransition()
  const [savedPending, startSaved] = useTransition()
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [ready, setReady] = useState(false)
  const [method, setMethod] = useState<'saved' | 'card' | 'promptpay'>(savedCards.length > 0 ? 'saved' : 'card')
  const [selectedCardId, setSelectedCardId] = useState(savedCards.find(c => c.is_default)?.id ?? savedCards[0]?.id ?? '')

  // PromptPay state
  const [qrUrl, setQrUrl] = useState<string | null>(null)
  const [chargeId, setChargeId] = useState<string | null>(null)

  useEffect(() => {
    if (window.OmiseCard) { setReady(true); return }
    const t = setInterval(() => {
      if (window.OmiseCard) { setReady(true); clearInterval(t) }
    }, 200)
    return () => clearInterval(t)
  }, [])

  // Poll PromptPay charge status
  useEffect(() => {
    if (!chargeId) return
    let cancelled = false

    const check = async () => {
      if (cancelled) return
      const res = await pollAndActivate({ chargeId, plan, billing })
      if (cancelled) return
      if (res.status === 'successful') {
        setSuccess(true)
      } else if (res.status === 'failed' || res.status === 'expired') {
        setError('การชำระเงินล้มเหลวหรือหมดเวลา กรุณาสร้าง QR ใหม่')
        setQrUrl(null)
        setChargeId(null)
      } else {
        setTimeout(check, 4000)
      }
    }

    const t = setTimeout(check, 4000)
    return () => { cancelled = true; clearTimeout(t) }
  }, [chargeId, plan, billing])

  function handleSavedCard() {
    if (!selectedCardId) { setError('กรุณาเลือกบัตร'); return }
    setError('')
    startSaved(async () => {
      const res = await chargeWithSavedCard({ plan, billing, cardId: selectedCardId })
      if (res.error) setError(res.error)
      else setSuccess(true)
    })
  }

  function handlePay() {
    const pubKey = process.env.NEXT_PUBLIC_OMISE_PUBLIC_KEY
    if (!pubKey) { setError('ระบบชำระเงินยังไม่พร้อม กรุณาติดต่อเรา'); return }
    if (!window.OmiseCard) { setError('กำลังโหลดระบบชำระเงิน กรุณารอสักครู่แล้วลองใหม่'); return }
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

  function handlePromptPay() {
    setError('')
    startQr(async () => {
      const res = await createPromptPayCharge({ plan, billing })
      if (res.error) { setError(res.error); return }
      setQrUrl(res.qr_url!)
      setChargeId(res.chargeId!)
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
        <a href="/dashboard" className="inline-block px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition">
          ไปที่ Dashboard
        </a>
      </div>
    )
  }

  const monthlyEquiv = plan === 'business' ? 1990 : 990
  const savings = billing === 'yearly'
    ? Math.round((1 - amount / (monthlyEquiv * 12)) * 100)
    : 0

  const features = PLAN_FEATURES[plan] ?? []

  return (
    <>
      <Script src="https://cdn.omise.co/omise.js" strategy="afterInteractive" />

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
          {features.map(f => (
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

      {/* Payment method tabs */}
      <div className="flex gap-2 mb-4">
        {savedCards.length > 0 && (
          <button
            type="button"
            onClick={() => { setMethod('saved'); setQrUrl(null); setChargeId(null); setError('') }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium rounded-xl border transition ${
              method === 'saved' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
            }`}
          >
            <Star className="w-4 h-4" />
            บัตรที่บันทึก
          </button>
        )}
        <button
          type="button"
          onClick={() => { setMethod('card'); setQrUrl(null); setChargeId(null); setError('') }}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium rounded-xl border transition ${
            method === 'card' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          บัตรใหม่
        </button>
        <button
          type="button"
          onClick={() => { setMethod('promptpay'); setError('') }}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium rounded-xl border transition ${
            method === 'promptpay' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
          }`}
        >
          <QrCode className="w-4 h-4" />
          PromptPay
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-600 mb-4">
          {error}
        </div>
      )}

      {/* Saved cards */}
      {method === 'saved' && (
        <div className="space-y-3 mb-4">
          {savedCards.map(card => (
            <button
              key={card.id}
              type="button"
              onClick={() => setSelectedCardId(card.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition text-left ${
                selectedCardId === card.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 bg-white hover:border-blue-300'
              }`}
            >
              <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                selectedCardId === card.id ? 'border-blue-600' : 'border-gray-300'
              }`}>
                {selectedCardId === card.id && <div className="w-2 h-2 rounded-full bg-blue-600" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold ${BRAND_COLORS[card.brand] ?? 'text-gray-800'}`}>
                  {card.brand} •••• {card.last_digits}
                </p>
                <p className="text-xs text-gray-400">{card.name} · หมดอายุ {card.expiration_month}/{card.expiration_year}</p>
              </div>
              {card.is_default && (
                <span className="text-xs text-yellow-600 font-medium bg-yellow-50 px-2 py-0.5 rounded-full">หลัก</span>
              )}
            </button>
          ))}
          <button
            type="button"
            onClick={handleSavedCard}
            disabled={savedPending || !selectedCardId}
            className="w-full flex items-center justify-center gap-2 py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold rounded-xl transition text-sm"
          >
            <CreditCard className="w-5 h-5" />
            {savedPending ? 'กำลังดำเนินการ...' : `ชำระ ฿${amount.toLocaleString('th-TH')}`}
          </button>
        </div>
      )}

      {/* Card payment */}
      {method === 'card' && (
        <button
          onClick={handlePay}
          disabled={pending || !ready}
          className="w-full flex items-center justify-center gap-2 py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold rounded-xl transition text-sm"
        >
          <CreditCard className="w-5 h-5" />
          {pending ? 'กำลังดำเนินการ...' : !ready ? 'กำลังโหลด...' : `ชำระด้วยบัตรเครดิต ฿${amount.toLocaleString('th-TH')}`}
        </button>
      )}

      {/* PromptPay */}
      {method === 'promptpay' && (
        qrUrl ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-center">
            <p className="text-sm font-medium text-gray-700 mb-3">สแกน QR Code เพื่อชำระ ฿{amount.toLocaleString('th-TH')}</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrUrl} alt="PromptPay QR Code" className="w-52 h-52 mx-auto rounded-xl border border-gray-200" />
            <p className="text-xs text-gray-400 mt-3 flex items-center justify-center gap-1.5">
              <Loader2 className="w-3 h-3 animate-spin" />
              กำลังรอการยืนยันการชำระเงิน...
            </p>
            <p className="text-xs text-gray-400 mt-1">QR มีอายุ 15 นาที</p>
          </div>
        ) : (
          <button
            type="button"
            onClick={handlePromptPay}
            disabled={qrPending}
            className="w-full flex items-center justify-center gap-2 py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold rounded-xl transition text-sm"
          >
            <QrCode className="w-5 h-5" />
            {qrPending ? 'กำลังสร้าง QR...' : `สร้าง QR Code ฿${amount.toLocaleString('th-TH')}`}
          </button>
        )
      )}

      <div className="flex items-center justify-center gap-1.5 mt-3">
        <ShieldCheck className="w-3.5 h-3.5 text-gray-400" />
        <p className="text-xs text-gray-400">ชำระเงินผ่าน Omise · ปลอดภัยด้วย SSL 256-bit · ไม่เก็บข้อมูลบัตร</p>
      </div>
    </>
  )
}
