'use client'

import { useState, useTransition } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Star } from 'lucide-react'
import { toggleVideoActive, toggleVideoFeatured, deleteVideo } from './actions'
import { extractYouTubeId, youTubeThumbnailUrl } from '@/lib/youtube'

export interface WebsiteVideo {
  id: string
  title: string
  title_en?: string | null
  youtube_url: string
  description?: string | null
  sort_order: number
  featured: boolean
  is_active: boolean
  created_at: string
}

export default function VideoCard({ video }: { video: WebsiteVideo }) {
  const [active, setActive]               = useState(video.is_active)
  const [featured, setFeatured]           = useState(video.featured)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [activePending, startActive]      = useTransition()
  const [featuredPending, startFeatured]  = useTransition()
  const [deletePending, startDelete]      = useTransition()

  const videoId   = extractYouTubeId(video.youtube_url)
  const thumbUrl  = videoId ? youTubeThumbnailUrl(videoId) : null

  function handleToggleActive() {
    const prev = active
    setActive(!prev)
    startActive(async () => { await toggleVideoActive(video.id, prev) })
  }

  function handleToggleFeatured() {
    const prev = featured
    setFeatured(!prev)
    startFeatured(async () => { await toggleVideoFeatured(video.id, prev) })
  }

  function handleDelete() {
    if (!confirmDelete) { setConfirmDelete(true); return }
    startDelete(async () => { await deleteVideo(video.id) })
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex gap-4 items-start">
      {/* Thumbnail */}
      <div className="w-28 h-16 sm:w-36 sm:h-20 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0 relative">
        {thumbUrl ? (
          <Image src={thumbUrl} alt={video.title} fill className="object-cover" sizes="144px" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-200">
            <span className="text-xs text-gray-400">ไม่พบภาพ</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
          }`}>
            {active ? 'แสดง' : 'ซ่อน'}
          </span>
          {featured && (
            <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-yellow-100 text-yellow-700 flex items-center gap-1">
              <Star className="w-3 h-3" />
              แนะนำ
            </span>
          )}
          <span className="text-xs text-gray-400">ลำดับ #{video.sort_order}</span>
        </div>
        <p className="font-medium text-gray-900 text-sm truncate">{video.title}</p>
        {video.title_en && <p className="text-xs text-gray-400 mt-0.5 truncate">{video.title_en}</p>}
        {video.description && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{video.description}</p>}
        <p className="text-xs text-blue-500 mt-1 truncate max-w-xs">{video.youtube_url}</p>
      </div>

      {/* Actions */}
      <div className="flex flex-col items-end gap-2 flex-shrink-0">
        {/* Active toggle */}
        <button
          type="button"
          onClick={handleToggleActive}
          disabled={activePending}
          title={active ? 'คลิกเพื่อซ่อน' : 'คลิกเพื่อแสดง'}
          className={`relative w-11 h-6 rounded-full transition-colors disabled:opacity-50 ${active ? 'bg-green-500' : 'bg-gray-200'}`}
        >
          <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${active ? 'translate-x-5' : ''}`} />
        </button>

        {/* Featured toggle */}
        <button
          type="button"
          onClick={handleToggleFeatured}
          disabled={featuredPending}
          title={featured ? 'ยกเลิกแนะนำ' : 'ตั้งเป็นแนะนำ'}
          className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg transition disabled:opacity-50 ${
            featured ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
          }`}
        >
          <Star className="w-3 h-3" />
          {featured ? 'แนะนำ' : 'ปกติ'}
        </button>

        {/* Edit / Delete */}
        <div className="flex items-center gap-1.5">
          <Link
            href={`/admin/videos/${video.id}/edit`}
            className="px-3 py-1.5 text-xs font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg transition"
          >
            แก้ไข
          </Link>
          <button
            onClick={handleDelete}
            onBlur={() => setConfirmDelete(false)}
            disabled={deletePending}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition disabled:opacity-50 ${
              confirmDelete ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-red-50 text-red-600 hover:bg-red-100'
            }`}
          >
            {deletePending ? '...' : confirmDelete ? 'ยืนยันลบ?' : 'ลบ'}
          </button>
        </div>
      </div>
    </div>
  )
}
