'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Building2 } from 'lucide-react'
import { useRecentlyViewed } from '@/hooks/useRecentlyViewed'
import { formatRoomType } from '@/types'
import type { RecentProperty } from '@/hooks/useRecentlyViewed'

function fmt(n: number) {
  return new Intl.NumberFormat('th-TH').format(n)
}

export default function RecentlyViewed({ current }: { current: RecentProperty }) {
  const { recent, addProperty } = useRecentlyViewed()

  useEffect(() => {
    addProperty(current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current.id])

  const others = recent.filter(p => p.id !== current.id)
  if (others.length === 0) return null

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/70">
        <h2 className="text-sm font-semibold text-gray-700">ทรัพย์ที่ดูล่าสุด</h2>
      </div>
      <div className="divide-y divide-gray-100">
        {others.map(p => {
          const price = p.listing_type === 'sale' ? p.sale_price : p.rent_price
          return (
            <Link key={p.id} href={`/listing/${p.id}`}
              className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition">
              {p.photo_thumb_url ? (
                <div className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
                  <Image src={p.photo_thumb_url} alt="" fill sizes="48px" className="object-cover" />
                </div>
              ) : (
                <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                  <Building2 className="w-5 h-5 text-gray-300" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">
                  {p.project_name ?? 'ไม่ระบุโครงการ'}
                </p>
                {p.room_type && (
                  <p className="text-xs text-gray-500">{formatRoomType(p.room_type)}</p>
                )}
              </div>
              {price != null && (
                <p className="text-sm font-semibold text-gray-900 flex-shrink-0">
                  ฿{fmt(price)}
                  {p.listing_type !== 'sale' && <span className="text-xs font-normal text-gray-400">/เดือน</span>}
                </p>
              )}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
