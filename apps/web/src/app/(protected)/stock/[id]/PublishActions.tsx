'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Globe, GlobeLock, AlertCircle } from 'lucide-react'
import PublishModal from '@/components/credits/PublishModal'
import UpsellModal from '@/components/credits/UpsellModal'
import HotBadge from '@/components/credits/HotBadge'
import { unpublishStock } from '@/lib/credits/actions'

interface Props {
  stockId: string
  isPublished: boolean
  isPremium: boolean
  status: string
  currentBalance: number
  accountPending?: boolean
  /** Rented unit within 45 days of its lease end — may be re-published as "ว่างเร็วๆนี้". */
  soonFree?: boolean
}

export default function PublishActions({ stockId, isPublished, isPremium, status, currentBalance, accountPending = false, soonFree = false }: Props) {
  const router = useRouter()
  const [showPublish, setShowPublish] = useState(false)
  const [showUpsell, setShowUpsell] = useState(false)
  const [balance, setBalance] = useState(currentBalance)
  const [upsellRequired, setUpsellRequired] = useState(0)
  const [unpublishing, setUnpublishing] = useState(false)

  async function handleUnpublish() {
    setUnpublishing(true)
    await unpublishStock(stockId)
    setUnpublishing(false)
    router.refresh()
  }

  if (isPublished) {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        {isPremium && <HotBadge />}
        <button
          onClick={handleUnpublish}
          disabled={unpublishing}
          className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 text-sm font-medium rounded-lg transition disabled:opacity-50"
        >
          <GlobeLock className="w-3.5 h-3.5" />
          {unpublishing ? '...' : 'ถอดออก'}
        </button>
      </div>
    )
  }

  if (accountPending) {
    return (
      <div className="flex items-center gap-1.5 px-3 py-2 bg-amber-50 border border-amber-200 text-amber-700 text-sm font-medium rounded-lg cursor-not-allowed"
        title="บัญชีของคุณยังอยู่ระหว่างรอการอนุมัติจากแอดมิน">
        <AlertCircle className="w-3.5 h-3.5" />
        เผยแพร่ได้เมื่ออนุมัติ
      </div>
    )
  }

  if (status !== 'available' && !soonFree) {
    return (
      <div className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 text-gray-400 text-sm font-medium rounded-lg cursor-not-allowed"
        title="เผยแพร่ได้เฉพาะทรัพย์สถานะ 'ว่าง' หรือทรัพย์เช่าที่ใกล้หมดสัญญา">
        <AlertCircle className="w-3.5 h-3.5" />
        เผยแพร่ไม่ได้
      </div>
    )
  }

  return (
    <>
      <button
        onClick={() => setShowPublish(true)}
        className="flex items-center gap-1.5 px-4 py-2 bg-green-600 hover:bg-green-700 active:bg-green-800 text-white text-sm font-medium rounded-lg transition"
      >
        <Globe className="w-3.5 h-3.5" />
        เผยแพร่
      </button>

      {showPublish && (
        <PublishModal
          stockId={stockId}
          currentBalance={balance}
          onClose={() => setShowPublish(false)}
          onSuccess={(newBalance) => {
            setBalance(newBalance)
            setShowPublish(false)
            router.refresh()
          }}
          onInsufficientCredits={(required) => {
            setShowPublish(false)
            setUpsellRequired(required)
            setShowUpsell(true)
          }}
        />
      )}

      {showUpsell && (
        <UpsellModal
          balance={balance}
          required={upsellRequired}
          onClose={() => setShowUpsell(false)}
        />
      )}
    </>
  )
}
