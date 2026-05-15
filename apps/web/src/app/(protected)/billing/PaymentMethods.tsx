'use client'

import { useState, useTransition, useEffect } from 'react'
import Script from 'next/script'
import {
  CreditCard, Plus, Trash2, Star, Loader2, ShieldCheck, CheckCircle2, AlertCircle,
} from 'lucide-react'
import type { SavedCard } from './actions'
import { addCard, removeCard, setDefaultCard } from './actions'
import { useRouter } from 'next/navigation'

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

const BRAND_COLORS: Record<string, string> = {
  Visa: 'bg-blue-600',
  Mastercard: 'bg-orange-500',
  JCB: 'bg-green-600',
  'American Express': 'bg-blue-800',
  Discover: 'bg-orange-400',
}

interface Props {
  initialCards: SavedCard[]
}

export default function PaymentMethods({ initialCards }: Props) {
  const router = useRouter()
  const [cards, setCards] = useState(initialCards)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [omiseReady, setOmiseReady] = useState(false)
  const [addPending, startAdd] = useTransition()
  const [actionPending, startAction] = useTransition()
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window !== 'undefined' && window.OmiseCard) setOmiseReady(true)
  }, [])

  function flash(msg: string) {
    setSuccess(msg)
    setTimeout(() => setSuccess(''), 3000)
  }

  function handleAddCard() {
    const pubKey = process.env.NEXT_PUBLIC_OMISE_PUBLIC_KEY
    if (!pubKey || !omiseReady) {
      setError('ระบบชำระเงินยังไม่พร้อม กรุณารอสักครู่')
      return
    }
    setError('')
    window.OmiseCard.configure({ publicKey: pubKey })
    window.OmiseCard.open({
      frameLabel: 'Proppsy — เพิ่มบัตร',
      submitLabel: 'บันทึกบัตร',
      currency: 'THB',
      amount: 0,
      onCreateTokenSuccess: (token) => {
        startAdd(async () => {
          const res = await addCard(token)
          if (res.error) { setError(res.error); return }
          flash('เพิ่มบัตรสำเร็จ')
          router.refresh()
        })
      },
      onFormClosed: () => {},
    })
  }

  function handleRemove(cardId: string) {
    setDeletingId(cardId)
    setError('')
    startAction(async () => {
      const res = await removeCard(cardId)
      setDeletingId(null)
      if (res.error) { setError(res.error); return }
      setCards(prev => prev.filter(c => c.id !== cardId))
      flash('ลบบัตรแล้ว')
    })
  }

  function handleSetDefault(cardId: string) {
    setError('')
    startAction(async () => {
      const res = await setDefaultCard(cardId)
      if (res.error) { setError(res.error); return }
      setCards(prev => prev.map(c => ({ ...c, is_default: c.id === cardId })))
      flash('ตั้งบัตรหลักแล้ว')
    })
  }

  return (
    <>
      <Script
        src="https://cdn.omise.co/omise.js"
        strategy="afterInteractive"
        onLoad={() => setOmiseReady(true)}
      />

      <div className="space-y-3">
        {error && (
          <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-600">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            {error}
          </div>
        )}
        {success && (
          <div className="flex items-center gap-2 bg-green-50 border border-green-100 rounded-xl px-4 py-3 text-sm text-green-700">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            {success}
          </div>
        )}

        {/* Card list */}
        {cards.length === 0 ? (
          <div className="text-center py-10 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
            <CreditCard className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-500">ยังไม่มีบัตรที่บันทึกไว้</p>
            <p className="text-xs text-gray-400 mt-1">บัตรที่บันทึกจะถูกใช้ชำระค่าแพ็กเกจอัตโนมัติ</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {cards.map(card => (
              <div
                key={card.id}
                className={`flex items-center gap-3 p-4 rounded-2xl border transition ${
                  card.is_default
                    ? 'bg-blue-50 border-blue-200'
                    : 'bg-white border-gray-100'
                }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${BRAND_COLORS[card.brand] ?? 'bg-gray-500'}`}>
                  {card.brand.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-gray-900">
                      {card.brand} •••• {card.last_digits}
                    </p>
                    {card.is_default && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                        หลัก
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    หมดอายุ {String(card.expiration_month).padStart(2, '0')}/{card.expiration_year}
                    {card.name && ` · ${card.name}`}
                  </p>
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {!card.is_default && (
                    <button
                      type="button"
                      onClick={() => handleSetDefault(card.id)}
                      disabled={actionPending}
                      title="ตั้งเป็นบัตรหลัก"
                      className="w-8 h-8 flex items-center justify-center rounded-xl bg-gray-100 hover:bg-blue-100 text-gray-400 hover:text-blue-600 transition disabled:opacity-40"
                    >
                      <Star className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleRemove(card.id)}
                    disabled={actionPending}
                    title="ลบบัตร"
                    className="w-8 h-8 flex items-center justify-center rounded-xl bg-gray-100 hover:bg-red-100 text-gray-400 hover:text-red-500 transition disabled:opacity-40"
                  >
                    {deletingId === card.id
                      ? <Loader2 className="w-4 h-4 animate-spin" />
                      : <Trash2 className="w-4 h-4" />
                    }
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add card button */}
        <button
          type="button"
          onClick={handleAddCard}
          disabled={addPending || !omiseReady}
          className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-blue-200 text-blue-600 hover:border-blue-400 hover:bg-blue-50 rounded-2xl text-sm font-semibold transition disabled:opacity-50"
        >
          {addPending
            ? <Loader2 className="w-4 h-4 animate-spin" />
            : <Plus className="w-4 h-4" />
          }
          {addPending ? 'กำลังเพิ่มบัตร...' : 'เพิ่มบัตรใหม่'}
        </button>

        <div className="flex items-center justify-center gap-1.5 pt-1">
          <ShieldCheck className="w-3.5 h-3.5 text-gray-400" />
          <p className="text-xs text-gray-400">ปลอดภัยด้วย Omise · SSL 256-bit · ไม่เก็บข้อมูลบัตรในระบบ</p>
        </div>
      </div>
    </>
  )
}
