'use client'

import { useState, useTransition } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { toggleBannerActive, deleteBanner } from './actions'

interface Banner {
  id: string
  title: string
  image_url?: string | null
  link_url?: string | null
  position: string
  is_active: boolean
  start_date?: string | null
  end_date?: string | null
  sort_order: number
  created_at: string
}

const POSITION_LABELS: Record<string, string> = {
  home_top:         'หน้าแรก (บนสุด)',
  listing_top:      'หน้า Listing (บน)',
  dashboard_top:    'Dashboard (บน)',
  listing_sidebar:  'Listing (Sidebar)',
}

const POSITION_COLORS: Record<string, string> = {
  home_top:         'bg-blue-100 text-blue-700',
  listing_top:      'bg-purple-100 text-purple-700',
  dashboard_top:    'bg-orange-100 text-orange-700',
  listing_sidebar:  'bg-teal-100 text-teal-700',
}

function formatDate(d: string | null | undefined) {
  if (!d) return null
  return new Date(d).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })
}

export default function BannerCard({ banner }: { banner: Banner }) {
  const [active, setActive]                 = useState(banner.is_active)
  const [togglePending, startToggle]        = useTransition()
  const [deletePending, startDelete]        = useTransition()
  const [confirmDelete, setConfirmDelete]   = useState(false)

  function handleToggle() {
    const prev = active
    setActive(!prev)
    startToggle(async () => {
      await toggleBannerActive(banner.id, prev)
    })
  }

  function handleDeleteClick() {
    if (!confirmDelete) { setConfirmDelete(true); return }
    startDelete(async () => {
      await deleteBanner(banner.id)
    })
  }

  const posLabel = POSITION_LABELS[banner.position] ?? banner.position
  const posColor = POSITION_COLORS[banner.position] ?? 'bg-gray-100 text-gray-600'
  const startFmt = formatDate(banner.start_date)
  const endFmt   = formatDate(banner.end_date)

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex gap-4">
      {/* Thumbnail — 16:9 */}
      <div className="w-24 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100" style={{ aspectRatio: '16/9' }}>
        {banner.image_url ? (
          <Image src={banner.image_url} alt={banner.title} width={96} height={54} className="object-cover w-full h-full" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">ไม่มีรูป</div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${posColor}`}>
            {posLabel}
          </span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
            {active ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
          </span>
          <span className="text-xs text-gray-400">ลำดับ #{banner.sort_order}</span>
        </div>
        <p className="font-medium text-gray-900 text-sm line-clamp-1">{banner.title}</p>
        {banner.link_url && (
          <p className="text-xs text-blue-500 line-clamp-1 mt-0.5">{banner.link_url}</p>
        )}
        {(startFmt || endFmt) && (
          <p className="text-xs text-gray-400 mt-0.5">
            {startFmt && endFmt ? `${startFmt} — ${endFmt}` : startFmt ? `เริ่ม ${startFmt}` : `ถึง ${endFmt}`}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-col items-end gap-2 flex-shrink-0">
        <button
          type="button"
          onClick={handleToggle}
          disabled={togglePending}
          title={active ? 'คลิกเพื่อปิด' : 'คลิกเพื่อเปิด'}
          className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 disabled:opacity-50 ${active ? 'bg-green-500' : 'bg-gray-200'}`}
        >
          <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${active ? 'translate-x-5' : ''}`} />
        </button>
        <div className="flex items-center gap-1.5">
          <Link
            href={`/admin/banners/${banner.id}/edit`}
            className="px-3 py-1.5 text-xs font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg transition"
          >
            แก้ไข
          </Link>
          <button
            onClick={handleDeleteClick}
            onBlur={() => setConfirmDelete(false)}
            disabled={deletePending}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition disabled:opacity-50 ${
              confirmDelete
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-red-50 text-red-600 hover:bg-red-100'
            }`}
          >
            {deletePending ? '...' : confirmDelete ? 'ยืนยันลบ?' : 'ลบ'}
          </button>
        </div>
      </div>
    </div>
  )
}
