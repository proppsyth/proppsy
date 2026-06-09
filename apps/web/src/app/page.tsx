import Link from 'next/link'
import StorageImage from '@/components/shared/StorageImage'
import { Building2, ArrowRight, Newspaper } from 'lucide-react'
import { Suspense } from 'react'
import type { Metadata } from 'next'
import { createServiceClient } from '@/lib/supabase/server'
import PublicNav from '@/components/shared/PublicNav'
import PublicFooter from '@/components/shared/PublicFooter'
import FilterBar from './listing/FilterBar'
import HeroBanner from './listing/HeroBanner'
import StatsCounter from './listing/StatsCounter'
import { BannerStrip } from '@/components/shared/BannerZone'
import PropertyCard from './listing/PropertyCard'
import type { StockWithProject } from './listing/PropertyCard'
import { extractYouTubeId, youTubeEmbedUrl } from '@/lib/youtube'

export const metadata: Metadata = {
  title: 'Proppsy — ค้นหาที่พัก เช่า ขาย คอนโด บ้าน',
  description: 'ค้นหาคอนโด บ้าน และทรัพย์สินให้เช่า-ขายในประเทศไทย ดูประกาศจากเอเจนต์มืออาชีพ ราคาตรงจากเจ้าของ',
  openGraph: {
    title: 'Proppsy — ค้นหาที่พัก เช่า ขาย คอนโด บ้าน',
    description: 'ค้นหาคอนโด บ้าน และทรัพย์สินให้เช่า-ขายในประเทศไทย ดูประกาศจากเอเจนต์มืออาชีพ',
    url: '/',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Proppsy — ค้นหาที่พัก เช่า ขาย คอนโด บ้าน',
    description: 'ค้นหาคอนโด บ้าน และทรัพย์สินให้เช่า-ขายในประเทศไทย',
  },
}

const ARTICLE_CATEGORY_LABELS: Record<string, string> = {
  general: 'ทั่วไป',
  guide:   'คู่มือ',
  market:  'ตลาด',
  update:  'อัปเดต',
}
const ARTICLE_CATEGORY_COLORS: Record<string, string> = {
  general: 'bg-gray-100 text-gray-600',
  guide:   'bg-blue-100 text-blue-700',
  market:  'bg-purple-100 text-purple-700',
  update:  'bg-orange-100 text-orange-700',
}

function buildListingUrl(filters: {
  q: string; listing_type: string; room_type: string; province: string; bts_mrt: string
}) {
  const params = new URLSearchParams()
  if (filters.q.trim())                               params.set('q',            filters.q.trim())
  if (filters.listing_type && filters.listing_type !== 'all') params.set('listing_type', filters.listing_type)
  if (filters.room_type    && filters.room_type    !== 'all') params.set('room_type',    filters.room_type)
  if (filters.province     && filters.province     !== 'all') params.set('province',     filters.province)
  if (filters.bts_mrt      && filters.bts_mrt      !== 'all') params.set('bts_mrt',      filters.bts_mrt)
  return `/listing${params.size > 0 ? '?' + params.toString() : ''}`
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ listing_type?: string; room_type?: string; province?: string; bts_mrt?: string; q?: string }>
}) {
  const { listing_type, room_type, province, bts_mrt, q } = await searchParams

  const supabase = createServiceClient()

  const [{ data: projectRows }, { data: latestNews }, { data: latestArticles }, { data: activePartners }, { data: featuredVideos }] = await Promise.all([
    supabase.from('projects').select('province, bts_mrt').not('province', 'is', null),
    supabase.from('news').select('id, title, summary, cover_url, created_at').eq('published', true).order('created_at', { ascending: false }).limit(3),
    supabase.from('articles').select('id, title, slug, excerpt, category').eq('is_published', true).order('created_at', { ascending: false }).limit(4),
    supabase.from('partners').select('id, name_th, name_en, logo_url, website').eq('is_active', true).order('sort_order'),
    supabase.from('website_videos').select('id, title, youtube_url').eq('is_active', true).eq('featured', true).order('sort_order').limit(1),
  ])

  const heroVideo = featuredVideos?.[0] ?? null
  const heroVideoId = heroVideo ? extractYouTubeId(heroVideo.youtube_url) : null

  const provinces = [...new Set(
    (projectRows ?? []).map((r: { province?: string }) => r.province).filter((p): p is string => !!p)
  )].sort()
  const btsMrtOptions = [...new Set(
    (projectRows ?? []).flatMap((r: { bts_mrt?: string[] }) => r.bts_mrt ?? []).filter(Boolean)
  )].sort() as string[]

  // Fetch top properties matching quick filters (fetch extra for geographic client-filter)
  let stockQuery = supabase
    .from('stock')
    .select('id, unit_no, room_type, size_sqm, floor, rent_price, sale_price, listing_type, photo_urls, photo_thumb_urls, project_name, project_id, is_premium, co_agent_accepted, project:projects(province, district, bts_mrt)')
    .eq('status', 'available')
    .eq('is_published', true)
    .order('is_premium', { ascending: false })
    .order('published_at', { ascending: false, nullsFirst: false })
    .limit(80)

  if (q?.trim())                stockQuery = stockQuery.ilike('project_name', `%${q.trim()}%`)
  if (listing_type === 'rent')  stockQuery = stockQuery.or('listing_type.eq.rent,listing_type.eq.both')
  else if (listing_type === 'sale') stockQuery = stockQuery.or('listing_type.eq.sale,listing_type.eq.both')
  if (room_type && room_type !== 'all') stockQuery = stockQuery.eq('room_type', room_type)

  const { data: stocksRaw } = await stockQuery
  let stocks = (stocksRaw ?? []) as unknown as StockWithProject[]

  // Geographic filter (client-side after fetch)
  if (province && province !== 'all') stocks = stocks.filter(s => s.project?.province === province)
  if (bts_mrt  && bts_mrt  !== 'all') stocks = stocks.filter(s => s.project?.bts_mrt?.includes(bts_mrt))

  const featuredStocks = stocks.slice(0, 8)
  const viewAllUrl = buildListingUrl({
    q: q ?? '', listing_type: listing_type ?? 'all', room_type: room_type ?? 'all',
    province: province ?? 'all', bts_mrt: bts_mrt ?? 'all',
  })

  return (
    <div className="min-h-screen bg-gray-50 overflow-x-hidden">
      <PublicNav />

      {/* ── Hero Banner ── */}
      <Suspense fallback={
        <div className="bg-blue-800 min-h-[280px] flex items-center justify-center">
          <div className="animate-pulse text-white/40 text-sm">กำลังโหลด...</div>
        </div>
      }>
        <HeroBanner currentQ={q ?? ''} />
      </Suspense>

      {/* ── Quick filters ── */}
      <div className="bg-white border-b border-gray-100 shadow-sm sticky top-14 z-10">
        <div className="max-w-6xl mx-auto px-4 py-2.5">
          <FilterBar
            currentListingType={listing_type ?? 'all'}
            currentRoomType={room_type ?? 'all'}
            currentProvince={province ?? 'all'}
            currentBtsMrt={bts_mrt ?? 'all'}
            provinces={provinces}
            btsMrtOptions={btsMrtOptions}
          />
        </div>
      </div>

      {/* ── Property grid ── */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-gray-500">
            {q?.trim() && <span>ค้นหา &ldquo;<span className="font-semibold text-gray-900">{q}</span>&rdquo; · </span>}
            แสดง <span className="font-semibold text-gray-900">{featuredStocks.length}</span> รายการ
            {province && province !== 'all' && ` ใน${province}`}
          </p>
          <Link href={viewAllUrl} className="flex items-center gap-1 text-sm text-blue-600 font-medium hover:text-blue-700 transition">
            ดูทั้งหมด <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {featuredStocks.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {featuredStocks.map(stock => (
              <PropertyCard key={stock.id} stock={stock} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20 text-gray-400">
            <Building2 className="w-12 h-12 mx-auto mb-3 opacity-25" />
            <p className="text-sm">ไม่พบทรัพย์สินที่ตรงกับเงื่อนไข</p>
            <Link href="/" className="text-xs text-blue-500 mt-2 inline-block">ล้างตัวกรอง</Link>
          </div>
        )}

        {/* View all CTA */}
        <div className="mt-6 text-center">
          <Link href={viewAllUrl}
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-2xl transition shadow-sm active:scale-95">
            <Building2 className="w-4 h-4" />
            ดูอสังหาริมทรัพย์ทั้งหมด
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* ── Animated Stats ── */}
      <StatsCounter />

      {/* ── Listing top banner ── */}
      <BannerStrip position="listing_top" />

      {/* ── YouTube / Video Section ── */}
      {heroVideoId ? (
        <div className="bg-gray-900 py-12">
          <div className="max-w-4xl mx-auto px-4">
            <p className="text-center text-gray-400 text-xs font-medium uppercase tracking-widest mb-3">วิดีโอแนะนำ</p>
            <h2 className="text-center text-white text-xl font-bold mb-6">{heroVideo!.title}</h2>
            <div className="relative aspect-video rounded-2xl overflow-hidden shadow-2xl">
              <iframe
                src={youTubeEmbedUrl(heroVideoId!)}
                title={heroVideo!.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="absolute inset-0 w-full h-full"
              />
            </div>
            <p className="text-center mt-4">
              <Link href="/videos" className="text-sm text-gray-400 hover:text-white transition">
                ดูวิดีโอทั้งหมด →
              </Link>
            </p>
          </div>
        </div>
      ) : null}

      {/* ── Trust / Partners ── */}
      {(activePartners?.length ?? 0) > 0 && (
        <div className="bg-white py-10 border-y border-gray-100">
          <div className="max-w-6xl mx-auto px-4">
            <p className="text-center text-gray-400 text-xs font-medium uppercase tracking-widest mb-6">
              เชื่อใจโดยเอเจนต์และบริษัทอสังหาฯ ชั้นนำ
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              {activePartners!.map(p => {
                const inner = (
                  <div className="flex items-center gap-2.5 px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl hover:bg-gray-100 transition">
                    {p.logo_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.logo_url} alt={p.name_en ?? p.name_th} className="h-7 w-auto object-contain flex-shrink-0" />
                    )}
                    <div className="flex flex-col leading-tight">
                      {p.name_en && <span className="text-sm font-semibold text-gray-800">{p.name_en}</span>}
                      <span className={`text-gray-500 ${p.name_en ? 'text-xs' : 'text-sm font-medium'}`}>{p.name_th}</span>
                    </div>
                  </div>
                )
                return p.website ? (
                  <a key={p.id} href={p.website} target="_blank" rel="noopener noreferrer">{inner}</a>
                ) : (
                  <div key={p.id}>{inner}</div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Articles ── */}
      {(latestArticles?.length ?? 0) > 0 && (
        <div className="max-w-6xl mx-auto px-4 py-10">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-gray-900">บทความ PropTech & IT</h2>
            <Link href="/articles" className="text-sm text-blue-600 hover:underline">ดูทั้งหมด →</Link>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {latestArticles!.map(a => (
              <Link key={a.id} href={`/articles/${a.slug}`}
                className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex flex-col gap-2 hover:shadow-md transition">
                <span className={`self-start text-xs font-semibold px-2 py-0.5 rounded-full ${ARTICLE_CATEGORY_COLORS[a.category] ?? 'bg-gray-100 text-gray-600'}`}>
                  {ARTICLE_CATEGORY_LABELS[a.category] ?? a.category}
                </span>
                <p className="text-sm font-semibold text-gray-900 leading-snug">{a.title}</p>
                {a.excerpt && <p className="text-xs text-gray-500 leading-relaxed flex-1 line-clamp-3">{a.excerpt}</p>}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ── News Section ── */}
      {(latestNews?.length ?? 0) > 0 && (
        <div className="max-w-6xl mx-auto px-4 pb-10">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Newspaper className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-bold text-gray-900">ข่าวสาร & อัปเดต</h2>
            </div>
            <Link href="/news" className="text-sm text-blue-600 hover:underline">ดูทั้งหมด →</Link>
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            {latestNews!.map(n => (
              <Link key={n.id} href={`/news/${n.id}`}
                className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition block group">
                <div className="relative aspect-video overflow-hidden">
                  <StorageImage
                    src={n.cover_url}
                    bucket="news"
                    alt={n.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                    sizes="(max-width: 640px) 100vw, 33vw"
                    fallback={
                      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
                        <Newspaper className="w-8 h-8 text-blue-200" />
                      </div>
                    }
                  />
                </div>
                <div className="p-4">
                  <p className="text-sm font-semibold text-gray-900 line-clamp-2 mb-1">{n.title}</p>
                  {n.summary && <p className="text-xs text-gray-400 line-clamp-2">{n.summary}</p>}
                  <p className="text-xs text-gray-300 mt-2">{new Date(n.created_at).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      <PublicFooter />
    </div>
  )
}
