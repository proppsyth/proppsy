'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowLeft, Star } from 'lucide-react'
import { updateVideo } from '../../actions'
import type { WebsiteVideo } from '../../VideoCard'
import { extractYouTubeId, youTubeThumbnailUrl } from '@/lib/youtube'

export default function EditVideoForm({ video }: { video: WebsiteVideo }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    title:       video.title,
    title_en:    video.title_en ?? '',
    youtube_url: video.youtube_url,
    description: video.description ?? '',
    sort_order:  video.sort_order,
    featured:    video.featured,
    is_active:   video.is_active,
  })

  function set<K extends keyof typeof form>(key: K, value: typeof form[K]) {
    setForm(f => ({ ...f, [key]: value }))
  }

  const videoId  = extractYouTubeId(form.youtube_url)
  const thumbUrl = videoId ? youTubeThumbnailUrl(videoId) : null

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim())       { setError('กรุณากรอกชื่อวิดีโอ'); return }
    if (!form.youtube_url.trim()) { setError('กรุณากรอก YouTube URL'); return }
    if (!videoId)                 { setError('YouTube URL ไม่ถูกต้อง'); return }
    setError('')
    startTransition(async () => {
      const res = await updateVideo(video.id, {
        title:       form.title.trim(),
        title_en:    form.title_en.trim() || null,
        youtube_url: form.youtube_url.trim(),
        description: form.description.trim() || null,
        sort_order:  form.sort_order,
        featured:    form.featured,
        is_active:   form.is_active,
      })
      if (res.error) { setError(res.error); return }
      router.push('/admin/videos')
    })
  }

  return (
    <div className="p-4 lg:p-8 pt-6 max-w-2xl">
      <Link href="/admin/videos" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition mb-5 w-fit">
        <ArrowLeft className="w-4 h-4" />
        กลับจัดการวิดีโอ
      </Link>
      <h1 className="text-xl font-bold text-gray-900 mb-6">แก้ไขวิดีโอ</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">

          {/* YouTube URL + preview */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">YouTube URL *</label>
            <input
              value={form.youtube_url}
              onChange={e => set('youtube_url', e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {thumbUrl && (
              <div className="mt-3 relative w-full aspect-video rounded-xl overflow-hidden bg-gray-100">
                <Image src={thumbUrl} alt="preview" fill className="object-cover" sizes="600px" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-12 h-12 bg-red-600/90 rounded-full flex items-center justify-center">
                    <svg viewBox="0 0 24 24" fill="white" className="w-5 h-5 ml-1">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Title TH */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">ชื่อวิดีโอ (ภาษาไทย) *</label>
            <input
              value={form.title}
              onChange={e => set('title', e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Title EN */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">ชื่อวิดีโอ (ภาษาอังกฤษ)</label>
            <input
              value={form.title_en}
              onChange={e => set('title_en', e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">คำอธิบาย</label>
            <textarea
              value={form.description}
              onChange={e => set('description', e.target.value)}
              rows={3}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* Sort order */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">ลำดับการแสดง</label>
            <input
              type="number"
              min={0}
              value={form.sort_order}
              onChange={e => set('sort_order', parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Featured toggle */}
          <div className="flex items-center gap-3 py-2 border-t border-gray-100">
            <button
              type="button"
              onClick={() => set('featured', !form.featured)}
              className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${form.featured ? 'bg-yellow-400' : 'bg-gray-200'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.featured ? 'translate-x-5' : ''}`} />
            </button>
            <div className="flex items-center gap-1.5">
              <Star className="w-4 h-4 text-yellow-500" />
              <p className="text-sm font-medium text-gray-700">{form.featured ? 'วิดีโอแนะนำ (แสดงบนหน้าแรก)' : 'วิดีโอทั่วไป'}</p>
            </div>
          </div>

          {/* Active toggle */}
          <div className="flex items-center gap-3 py-2 border-t border-gray-100">
            <button
              type="button"
              onClick={() => set('is_active', !form.is_active)}
              className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${form.is_active ? 'bg-green-500' : 'bg-gray-200'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.is_active ? 'translate-x-5' : ''}`} />
            </button>
            <p className="text-sm font-medium text-gray-700">{form.is_active ? 'แสดงบนเว็บ' : 'ซ่อน'}</p>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-600">{error}</div>
        )}

        <div className="flex gap-3">
          <Link
            href="/admin/videos"
            className="flex-1 py-3 border border-gray-200 text-gray-600 text-sm font-medium rounded-xl hover:bg-gray-50 transition text-center"
          >
            ยกเลิก
          </Link>
          <button
            type="submit"
            disabled={pending}
            className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm font-medium rounded-xl transition"
          >
            {pending ? 'กำลังบันทึก...' : 'บันทึก'}
          </button>
        </div>
      </form>
    </div>
  )
}
