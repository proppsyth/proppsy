'use client'

import { useState } from 'react'
import { motion, AnimatePresence, animate } from 'framer-motion'
import { X, Zap, Star, Loader2, CheckCircle2 } from 'lucide-react'
import { publishStock } from '@/lib/credits/actions'
import type { PublishTier } from '@/lib/credits/constants'
import HotBadge from './HotBadge'

const TIERS: Array<{
  tier: PublishTier
  label: string
  credits: number
  Icon: React.ComponentType<{ className?: string }>
  desc: string
  accent: string
  activeRing: string
}> = [
  {
    tier: 'standard',
    label: 'Standard',
    credits: 1,
    Icon: Zap,
    desc: 'แสดงในผลลัพธ์การค้นหาทั่วไป',
    accent: 'bg-blue-50 border-blue-200',
    activeRing: 'border-blue-500 ring-2 ring-blue-300',
  },
  {
    tier: 'premium',
    label: 'Premium',
    credits: 3,
    Icon: Star,
    desc: 'ขึ้นด้านบนสุด + HOT Badge 30 วัน',
    accent: 'bg-orange-50 border-orange-200',
    activeRing: 'border-orange-500 ring-2 ring-orange-300',
  },
]

interface Props {
  stockId: string
  currentBalance: number
  onClose: () => void
  onSuccess: (newBalance: number) => void
  onInsufficientCredits: (required: number) => void
}

export default function PublishModal({
  stockId,
  currentBalance,
  onClose,
  onSuccess,
  onInsufficientCredits,
}: Props) {
  const [tier, setTier] = useState<PublishTier>('standard')
  const [step, setStep] = useState<'select' | 'success'>('select')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [displayBalance, setDisplayBalance] = useState(currentBalance)

  const selected = TIERS.find(t => t.tier === tier)!
  const canAfford = currentBalance >= selected.credits

  async function handleConfirm() {
    setLoading(true)
    setError('')
    const res = await publishStock(stockId, tier)
    setLoading(false)

    if (res.insufficientCredits) {
      onClose()
      onInsufficientCredits(selected.credits)
      return
    }
    if (res.error) { setError(res.error); return }

    const finalBalance = res.balance ?? currentBalance - selected.credits

    // Animate credit counter countdown
    animate(currentBalance, finalBalance, {
      duration: 0.9,
      ease: 'easeOut',
      onUpdate: (v: number) => setDisplayBalance(Math.round(v)),
    })

    setStep('success')
    // Give user a moment to see the success state
    setTimeout(() => onSuccess(finalBalance), 2000)
  }

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
      >
        {/* Backdrop */}
        <motion.div
          className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          onClick={step === 'select' ? onClose : undefined}
        />

        {/* Sheet */}
        <motion.div
          className="relative z-10 bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-sm shadow-2xl overflow-hidden"
          initial={{ y: '100%', opacity: 0.5 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 30, stiffness: 320 }}
        >
          {/* Handle (mobile) */}
          <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mt-3 sm:hidden" />

          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-4 pb-3">
            <h2 className="text-base font-bold text-gray-900">
              {step === 'success' ? 'เผยแพร่สำเร็จ' : 'เลือกรูปแบบการเผยแพร่'}
            </h2>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>

          {/* Balance indicator */}
          <div className="px-5 pb-3">
            <p className="text-xs text-gray-500">
              เครดิตคงเหลือ:{' '}
              <span className="font-bold text-gray-900 tabular-nums text-sm">
                {step === 'success' ? displayBalance : currentBalance}
              </span>
            </p>
          </div>

          <div className="px-5 pb-6">
            {step === 'select' ? (
              <div className="space-y-4">
                {/* Tier cards */}
                <div className="grid grid-cols-2 gap-3">
                  {TIERS.map(t => (
                    <button
                      key={t.tier}
                      type="button"
                      onClick={() => setTier(t.tier)}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${
                        tier === t.tier ? t.activeRing : t.accent
                      }`}
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        <t.Icon className="w-4 h-4 text-gray-600" />
                        <span className="text-sm font-semibold text-gray-900">{t.label}</span>
                        {t.tier === 'premium' && <HotBadge />}
                      </div>
                      <p className="text-xs text-gray-500 leading-snug">{t.desc}</p>
                      <p className={`mt-2.5 text-sm font-bold ${
                        tier === t.tier ? 'text-blue-600' : 'text-gray-700'
                      }`}>
                        {t.credits} เครดิต
                      </p>
                    </button>
                  ))}
                </div>

                {!canAfford && (
                  <p className="text-xs text-red-500 bg-red-50 border border-red-100 px-3.5 py-2.5 rounded-xl">
                    เครดิตไม่เพียงพอ — ต้องการ {selected.credits} เครดิต (มี {currentBalance})
                  </p>
                )}
                {error && (
                  <p className="text-xs text-red-500 bg-red-50 border border-red-100 px-3.5 py-2.5 rounded-xl">
                    {error}
                  </p>
                )}

                <button
                  onClick={handleConfirm}
                  disabled={loading}
                  className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:bg-gray-200 disabled:text-gray-400 text-white text-sm font-semibold rounded-xl transition flex items-center justify-center gap-2"
                >
                  {loading
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> กำลังเผยแพร่...</>
                    : `ยืนยัน — ใช้ ${selected.credits} เครดิต`}
                </button>
              </div>
            ) : (
              /* Success state — animate-celebrate from globals.css */
              <div className="text-center py-6 space-y-4 animate-celebrate">
                <CheckCircle2 className="w-14 h-14 text-green-500 mx-auto" />
                <div>
                  <p className="font-semibold text-gray-900">เผยแพร่เรียบร้อย!</p>
                  <p className="text-sm text-gray-500 mt-1">
                    เครดิตคงเหลือ:{' '}
                    <span className="font-bold tabular-nums">{displayBalance}</span>
                  </p>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
