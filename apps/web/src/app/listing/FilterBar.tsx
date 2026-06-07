'use client'

import { useRouter, usePathname } from 'next/navigation'

const ROOM_TYPES = ['all', 'Studio', '1BR', '2BR', '3BR', 'Penthouse', 'อื่นๆ'] as const

interface Props {
  currentListingType: string
  currentRoomType: string
  currentProvince: string
  currentBtsMrt: string
  provinces: string[]
  btsMrtOptions: string[]
}

export default function FilterBar({
  currentListingType, currentRoomType, currentProvince, currentBtsMrt,
  provinces, btsMrtOptions,
}: Props) {
  const router = useRouter()
  const pathname = usePathname()

  function setFilter(key: string, value: string) {
    const params = new URLSearchParams()
    const lt = key === 'listing_type' ? value : currentListingType
    const rt = key === 'room_type'    ? value : currentRoomType
    const pv = key === 'province'     ? value : currentProvince
    const bm = key === 'bts_mrt'     ? value : currentBtsMrt
    if (lt && lt !== 'all') params.set('listing_type', lt)
    if (rt && rt !== 'all') params.set('room_type', rt)
    if (pv && pv !== 'all') params.set('province', pv)
    if (bm && bm !== 'all') params.set('bts_mrt', bm)
    const qs = params.toString()
    router.push(`${pathname}${qs ? '?' + qs : ''}`)
  }

  return (
    <div className="space-y-1.5">
      {/* Row 1: listing type */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
        <span className="text-xs text-gray-400 font-medium whitespace-nowrap">ประเภท:</span>
        {(['all', 'rent', 'sale'] as const).map(t => (
          <button key={t} onClick={() => setFilter('listing_type', t)}
            className={`px-3 py-1.5 text-xs rounded-full transition font-medium whitespace-nowrap flex-shrink-0 active:scale-95 ${currentListingType === t ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 active:bg-gray-200'}`}>
            {t === 'all' ? 'ทั้งหมด' : t === 'rent' ? 'เช่า' : 'ขาย'}
          </button>
        ))}
      </div>

      {/* Row 2: room type */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
        <span className="text-xs text-gray-400 font-medium whitespace-nowrap">ห้อง:</span>
        {ROOM_TYPES.map(rt => (
          <button key={rt} onClick={() => setFilter('room_type', rt)}
            className={`px-3 py-1.5 text-xs rounded-full transition font-medium whitespace-nowrap flex-shrink-0 active:scale-95 ${currentRoomType === rt ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 active:bg-gray-200'}`}>
            {rt === 'all' ? 'ทั้งหมด' : rt}
          </button>
        ))}
      </div>

      {/* Row 3: province */}
      {provinces.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
          <span className="text-xs text-gray-400 font-medium whitespace-nowrap">จังหวัด:</span>
          <button onClick={() => setFilter('province', 'all')}
            className={`px-3 py-1.5 text-xs rounded-full transition font-medium whitespace-nowrap flex-shrink-0 active:scale-95 ${currentProvince === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 active:bg-gray-200'}`}>
            ทุกจังหวัด
          </button>
          {provinces.map(p => (
            <button key={p} onClick={() => setFilter('province', p)}
              className={`px-3 py-1.5 text-xs rounded-full transition font-medium whitespace-nowrap flex-shrink-0 active:scale-95 ${currentProvince === p ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 active:bg-gray-200'}`}>
              {p}
            </button>
          ))}
        </div>
      )}

      {/* Row 4: BTS/MRT */}
      {btsMrtOptions.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
          <span className="text-xs text-gray-400 font-medium whitespace-nowrap">BTS/MRT:</span>
          <button onClick={() => setFilter('bts_mrt', 'all')}
            className={`px-3 py-1.5 text-xs rounded-full transition font-medium whitespace-nowrap flex-shrink-0 active:scale-95 ${currentBtsMrt === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 active:bg-gray-200'}`}>
            ทุกสาย
          </button>
          {btsMrtOptions.map(b => (
            <button key={b} onClick={() => setFilter('bts_mrt', b)}
              className={`px-3 py-1.5 text-xs rounded-full transition font-medium whitespace-nowrap flex-shrink-0 active:scale-95 ${currentBtsMrt === b ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 active:bg-gray-200'}`}>
              {b}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
