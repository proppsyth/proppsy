'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Globe, GlobeLock } from 'lucide-react'
import PublishModal from '@/components/credits/PublishModal'
import UpsellModal from '@/components/credits/UpsellModal'
import HotBadge from '@/components/credits/HotBadge'
import { unpublishStock } from '@/lib/credits/actions'

interface Props {
  stockId: string
  isPublished: boolean
  isPremium: boolean
  currentBalance: number
}

export default function PublishActions({ stockId, isPublished, isPremium, currentBalance }: Props) {
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
