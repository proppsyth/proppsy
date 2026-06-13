'use client'

import { GitCompareArrows } from 'lucide-react'
import { useCompare } from '@/contexts/compare'
import type { StockWithProject } from '@/app/listing/PropertyCard'

export default function CompareButton({ stock }: { stock: StockWithProject }) {
  const { isComparing, toggle, isFull } = useCompare()
  const active = isComparing(stock.id)
  const disabled = !active && isFull

  return (
    <button
      type="button"
      onClick={e => { e.preventDefault(); e.stopPropagation(); if (!disabled) toggle(stock) }}
      aria-label={active ? 'ยกเลิกเปรียบเทียบ' : 'เพิ่มเปรียบเทียบ'}
      title={disabled ? 'เลือกได้สูงสุด 3 รายการ' : undefined}
      className={`w-8 h-8 flex items-center justify-center rounded-full shadow transition active:scale-90 ${
        active
          ? 'bg-blue-600 text-white'
          : disabled
          ? 'bg-white/90 text-gray-300 cursor-not-allowed'
          : 'bg-white/90 text-gray-400 hover:text-blue-500'
      }`}
    >
      <GitCompareArrows className="w-4 h-4" />
    </button>
  )
}
