import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, Star, Video } from 'lucide-react'
import PublicNav from '@/components/shared/PublicNav'
import PublicFooter from '@/components/shared/PublicFooter'
import { createServiceClient } from '@/lib/supabase/server'
import { extractYouTubeId, youTubeThumbnailUrl, youTubeEmbedUrl } from '@/lib/youtube'

export const metadata: Metadata = {
  title: 'วิดีโอ — Proppsy',
  description: 'ดูวิดีโอแนะนำและสาธิตการใช้งาน Proppsy แพลตฟอร์มจัดการอสังหาริมทรัพย์',
}

interface WebsiteVideo {
  id: string
  title: string
  title_en?: string | null
  youtube_url: string
  description?: string | null
  sort_order: number
  featured: boolean
  is_active: boolean
}

export default async function VideosPage() {
  const supabase = createServiceClient()

  const { data } = await supabase
    .from('website_videos')
    .select('id, title, title_en, youtube_url, description, sort_order, featured, is_active')
    .eq('is_active', true)
    .order('featured', { ascending: false })
    .order('sort_order')
    .order('created_at', { ascending: false })

  const videos   = (data ?? []) as WebsiteVideo[]
  const featured = videos.filter(v => v.featured)
  const rest     = videos.filter(v => !v.featured)

  return (
    <div className="min-h-screen bg-gray-50">
      <PublicNav />

      {/* Hero */}
      <div className="bg-gray-900 py-10">
        <div className="max-w-5xl mx-auto px-4">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-white/60 hover:text-white text-sm transition mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            กลับหน้าหลัก
          </Link>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center">
              <Video className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">วิดีโอ Proppsy</h1>
          </div>
          <p className="text-white/60 text-sm">วิดีโอแนะนำและสาธิตการใช้งาน</p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8 pb-16">

        {videos.length === 0 ? (
          <div className="text-center py-24 text-gray-400">
            <Video className="w-12 h-12 mx-auto mb-3 opacity-25" />
            <p className="text-sm">ยังไม่มีวิดีโอในขณะนี้</p>
          </div>
        ) : (
          <>
            {/* ── Featured videos ── */}
            {featured.length > 0 && (
              <div className="mb-10">
                <div className="flex items-center gap-2 mb-5">
                  <Star className="w-4 h-4 text-yellow-500" />
                  <h2 className="text-base font-bold text-gray-900">วิดีโอแนะนำ</h2>
                </div>
                <div className="space-y-6">
                  {featured.map(video => {
                    const videoId = extractYouTubeId(video.youtube_url)
                    return (
                      <div key={video.id} className="bg-gray-900 rounded-2xl overflow-hidden">
                        {videoId ? (
                          <div className="relative aspect-video">
                            <iframe
                              src={youTubeEmbedUrl(videoId)}
                              title={video.title}
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                              className="absolute inset-0 w-full h-full"
                            />
                          </div>
                        ) : null}
                        <div className="p-5">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 font-medium flex items-center gap-1">
                              <Star className="w-3 h-3" />
                              แนะนำ
                            </span>
                          </div>
                          <h3 className="text-white font-bold text-lg">{video.title}</h3>
                          {video.title_en && <p className="text-gray-400 text-sm mt-0.5">{video.title_en}</p>}
                          {video.description && <p className="text-gray-300 text-sm mt-2 leading-relaxed">{video.description}</p>}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* ── Other videos ── */}
            {rest.length > 0 && (
              <div>
                {featured.length > 0 && (
                  <h2 className="text-base font-bold text-gray-900 mb-5">วิดีโอทั้งหมด</h2>
                )}
                <div className="grid sm:grid-cols-2 gap-4">
                  {rest.map(video => {
                    const videoId  = extractYouTubeId(video.youtube_url)
                    const thumbUrl = videoId ? youTubeThumbnailUrl(videoId) : null
                    return (
                      <div key={video.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        {/* Thumbnail */}
                        <div className="relative aspect-video bg-gray-100">
                          {thumbUrl ? (
                            <>
                              <Image src={thumbUrl} alt={video.title} fill className="object-cover" sizes="(max-width:640px) 100vw, 50vw" />
                              <a
                                href={video.youtube_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/30 transition"
                              >
                                <div className="w-12 h-12 bg-red-600/90 rounded-full flex items-center justify-center">
                                  <svg viewBox="0 0 24 24" fill="white" className="w-5 h-5 ml-1">
                                    <path d="M8 5v14l11-7z" />
                                  </svg>
                                </div>
                              </a>
                            </>
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <Video className="w-8 h-8 text-gray-300" />
                            </div>
                          )}
                        </div>
                        {/* Info */}
                        <div className="p-4">
                          <h3 className="font-semibold text-gray-900 text-sm mb-1">{video.title}</h3>
                          {video.title_en && <p className="text-xs text-gray-400 mb-1">{video.title_en}</p>}
                          {video.description && <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">{video.description}</p>}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <PublicFooter />
    </div>
  )
}
