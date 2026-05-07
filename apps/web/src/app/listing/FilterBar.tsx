'use client'

import { useRouter, usePathname } from 'next/navigation'
import type { RoomType } from '@/types'

const ROOM_TYPES: (RoomType | 'all')[] = ['all', 'Studio', '1BR', '2BR', '3BR', 'Penthouse', 'อื่นๆ']

const RENT_PRICE_BUCKETS = [
  { value: 'all', label: 'ทุกราคา' },
  { value: 'low', label: '≤15K' },
  { value: 'mid', label: '15K–30K' },
  { value: 'high', label: '30K–60K' },
  { value: 'premium', label: '60K+' },
]

const SALE_PRICE_BUCKETS = [
  { value: 'all', label: 'ทุกราคา' },
  { value: 'low', label: '≤2M' },
  { value: 'mid', label: '2M–5M' },
  { value: 'high', label: '5M–10M' },
  { value: 'premium', label: '10M+' },
]

interface Props {
  currentListingType: string
  currentRoomType: string
  currentProvince: string
  currentPriceBucket: string
  provinces: string[]
}

export default function FilterBar({ currentListingType, currentRoomType, currentProvince, currentPriceBucket, provinces }: Props) {
  const router = useRouter()
  const pathname = usePathname()

  function setFilter(key: string, value: string) {
    const params = new URLSearchParams()
    const lt = key === 'listing_type' ? value : currentListingType
    const rt = key === 'room_type' ? value : currentRoomType
    const pv = key === 'province' ? value : currentProvince
    // Reset price bucket when switching listing type
    const pb = key === 'price_bucket' ? value : (key === 'listing_type' ? 'all' : currentPriceBucket)
    if (lt && lt !== 'all') params.set('listing_type', lt)
    if (rt && rt !== 'all') params.set('room_type', rt)
    if (pv && pv !== 'all') params.set('province', pv)
    if (pb && pb !== 'all') params.set('price_bucket', pb)
    const qs = params.toString()
    router.push(`${pathname}${qs ? '?' + qs : ''}`)
  }

  const priceBuckets = currentListingType === 'sale' ? SALE_PRICE_BUCKETS : RENT_PRICE_BUCKETS

  return (
    <div className="space-y-1.5">
      {/* Row 1: listing type */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
        <span className="text-xs text-gray-400 font-medium whitespace-nowrap">ประเภท:</span>
        {(['all', 'rent', 'sale'] as const).map(t => (
          <button
            key={t}
            onClick={() => setFilter('listing_type', t)}
            className={`px-3 py-1.5 text-xs rounded-full transition font-medium whitespace-nowrap flex-shrink-0 active:scale-95 ${
              currentListingType === t
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 active:bg-gray-200'
            }`}
          >
            {t === 'all' ? 'ทั้งหมด' : t === 'rent' ? 'เช่า' : 'ขาย'}
          </button>
        ))}
      </div>

      {/* Row 2: room type */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
        <span className="text-xs text-gray-400 font-medium whitespace-nowrap">ห้อง:</span>
        {ROOM_TYPES.map(rt => (
          <button
            key={rt}
            onClick={() => setFilter('room_type', rt)}
            className={`px-3 py-1.5 text-xs rounded-full transition font-medium whitespace-nowrap flex-shrink-0 active:scale-95 ${
              currentRoomType === rt
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 active:bg-gray-200'
            }`}
          >
            {rt === 'all' ? 'ทั้งหมด' : rt}
          </button>
        ))}
      </div>

      {/* Row 3: price range (shown only when rent or sale is selected) */}
      {currentListingType !== 'all' && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
          <span className="text-xs text-gray-400 font-medium whitespace-nowrap">ราคา:</span>
          {priceBuckets.map(b => (
            <button
              key={b.value}
              onClick={() => setFilter('price_bucket', b.value)}
              className={`px-3 py-1.5 text-xs rounded-full transition font-medium whitespace-nowrap flex-shrink-0 active:scale-95 ${
                currentPriceBucket === b.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 active:bg-gray-200'
              }`}
            >
              {b.label}
            </button>
          ))}
        </div>
      )}

      {/* Row 4: province (only if data available) */}
      {provinces.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
          <span className="text-xs text-gray-400 font-medium whitespace-nowrap">จังหวัด:</span>
          <button
            onClick={() => setFilter('province', 'all')}
            className={`px-3 py-1.5 text-xs rounded-full transition font-medium whitespace-nowrap flex-shrink-0 active:scale-95 ${
              currentProvince === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 active:bg-gray-200'
            }`}
          >
            ทุกจังหวัด
          </button>
          {provinces.map(p => (
            <button
              key={p}
              onClick={() => setFilter('province', p)}
              className={`px-3 py-1.5 text-xs rounded-full transition font-medium whitespace-nowrap flex-shrink-0 active:scale-95 ${
                currentProvince === p ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 active:bg-gray-200'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
