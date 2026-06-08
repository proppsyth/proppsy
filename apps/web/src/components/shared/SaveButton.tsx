'use client'

import { Heart } from 'lucide-react'
import { useSavedProperties } from '@/hooks/useSavedProperties'

interface Props {
  stockId: string
  variant?: 'card' | 'detail'
}

export default function SaveButton({ stockId, variant = 'detail' }: Props) {
  const { isSaved, toggle } = useSavedProperties()
  const saved = isSaved(stockId)

  if (variant === 'card') {
    return (
      <button
        type="button"
        onClick={e => { e.preventDefault(); e.stopPropagation(); toggle(stockId) }}
        aria-label={saved ? 'ยกเลิกบันทึก' : 'บันทึก'}
        className={`w-8 h-8 flex items-center justify-center rounded-full bg-white/90 shadow transition active:scale-90 ${saved ? 'text-red-500' : 'text-gray-400 hover:text-red-400'}`}
      >
        <Heart className={`w-4 h-4 ${saved ? 'fill-red-500' : ''}`} />
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={() => toggle(stockId)}
      aria-label={saved ? 'ยกเลิกบันทึก' : 'บันทึกรายการโปรด'}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition active:scale-95 ${
        saved
          ? 'bg-red-50 border-red-200 text-red-600'
          : 'bg-white border-gray-200 text-gray-500 hover:border-red-200 hover:text-red-500'
      }`}
    >
      <Heart className={`w-3.5 h-3.5 ${saved ? 'fill-red-500' : ''}`} />
      {saved ? 'บันทึกแล้ว' : 'บันทึก'}
    </button>
  )
}
