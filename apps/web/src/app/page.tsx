import Link from 'next/link'
import StorageImage from '@/components/shared/StorageImage'
import {
  ArrowRight, Newspaper, Building2, Home, Star, MapPin,
  LayoutGrid, Bed, Building, Grid3X3, Layers,
  FileText, User, ClipboardList,
} from 'lucide-react'
import { Suspense } from 'react'
import type { Metadata } from 'next'
import { createServiceClient } from '@/lib/supabase/server'
import PublicNav from '@/components/shared/PublicNav'
import PublicFooter from '@/components/shared/PublicFooter'
import CompareBar from '@/components/shared/CompareBar'
import StatsCounter from './listing/StatsCounter'
import { BannerStrip } from '@/components/shared/BannerZone'
import PropertyCard from './listing/PropertyCard'
import type { StockWithProject } from './listing/PropertyCard'
import { extractYouTubeId, youTubeEmbedUrl } from '@/lib/youtube'
import HomeHeroClient from './HomeHeroClient'
import type { HeroSlide } from './listing/HeroBanner'
import type { LucideIcon } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Proppsy — ค้นหาที่พัก เช่า ขาย คอนโด บ้าน',
  description: 'ค้นหาคอนโด บ้าน และทรัพย์สินให้เช่า-ขายในประเทศไทย ดูประกาศจากเอเจนต์มืออาชีพ ราคาตรงจากเจ้าของ',
  openGraph: {
    title: 'Proppsy — ค้นหาที่พัก เช่า ขาย คอนโด บ้าน',
    description: 'ค้นหาคอนโด บ้าน และทรัพย์สินให้เช่า-ขายในประเทศไทย ดูประกาศจากเอเจนต์มืออาชีพ',
    url: '/',
  },
}

const ARTICLE_CATEGORY_LABELS: Record<string, string> = {
  general: 'ทั่วไป', guide: 'คู่มือ', market: 'ตลาด', update: 'อัปเดต',
}
const ARTICLE_CATEGORY_COLORS: Record<string, string> = {
  general: 'bg-gray-100 text-gray-600',
  guide:   'bg-blue-100 text-blue-700',
  market:  'bg-purple-100 text-purple-700',
  update:  'bg-orange-100 text-orange-700',
}

// Room type tiles — Lucide icons, monochrome blue palette
const ROOM_TYPE_TILES: { value: string; label: string; Icon: LucideIcon }[] = [
  { value: 'Studio',    label: 'Studio',      Icon: LayoutGrid  },
  { value: '1BR',       label: '1 ห้องนอน',   Icon: Bed         },
  { value: '2BR',       label: '2 ห้องนอน',   Icon: Building2   },
  { value: '3BR',       label: '3 ห้องนอน',   Icon: Home        },
  { value: 'Penthouse', label: 'Penthouse',    Icon: Layers      },
  { value: '',          label: 'ทั้งหมด',      Icon: Grid3X3     },
]

export default async function HomePage() {
  const supabase = createServiceClient()
  const today = new Date().toISOString().split('T')[0]!

  const [
    { data: projectRows },
    { data: bkkDistrictRows },
    { data: latestNews },
    { data: latestArticles },
    { data: activePartners },
    { data: featuredVideos },
    { data: stocksRaw },
    { data: bannerRows },
    { count: contractCount },
    { count: agentCount },
    { count: stockCount },
  ] = await Promise.all([
    supabase.from('projects').select('province, bts_mrt').not('province', 'is', null),
    supabase.from('projects').select('district').eq('province', 'กรุงเทพมหานคร').not('district', 'is', null),
    supabase.from('news').select('id, title, summary, cover_url, created_at').eq('published', true).order('created_at', { ascending: false }).limit(3),
    supabase.from('articles').select('id, title, slug, excerpt, category').eq('is_published', true).order('created_at', { ascending: false }).limit(4),
    supabase.from('partners').select('id, name_th, name_en, logo_url, website').eq('is_active', true).order('sort_order'),
    supabase.from('website_videos').select('id, title, youtube_url').eq('is_active', true).eq('featured', true).order('sort_order').limit(1),
    supabase.from('stock')
      .select('id, unit_no, room_type, size_sqm, floor, rent_price, sale_price, listing_type, photo_urls, photo_thumb_urls, project_name, project_id, is_premium, co_agent_accepted, project:projects(province, district, bts_mrt)')
      .eq('status', 'available')
      .eq('is_published', true)
      .order('is_premium', { ascending: false })
      .order('published_at', { ascending: false, nullsFirst: false })
      .limit(12),
    supabase.from('banners')
      .select('id, title, subtitle, tag, text_align, gradient, show_search, image_url, link_url')
      .eq('position', 'home_top')
      .eq('is_active', true)
      .or(`start_date.is.null,start_date.lte.${today}`)
      .or(`end_date.is.null,end_date.gte.${today}`)
      .order('sort_order'),
    supabase.from('contracts').select('*', { count: 'exact', head: true }),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('account_status', 'approved'),
    supabase.from('stock').select('*', { count: 'exact', head: true }).eq('is_published', true),
  ])

  const featuredStocks = (stocksRaw ?? []) as unknown as StockWithProject[]

  // Build hero slides
  const FALLBACK_SLIDES: HeroSlide[] = [
    {
      type: 'gradient',
      gradient: 'from-[#0f2044] via-[#1a3a6e] to-[#0e3460]',
      tag: '🏠 Proppsy Real Estate',
      title: 'ค้นพบที่พักในฝัน\nในแบบของคุณ',
      subtitle: 'ทรัพย์สินคุณภาพพร้อมเอเจนต์มืออาชีพ',
      showSearch: true,
    },
    {
      type: 'gradient',
      gradient: 'from-emerald-900 via-teal-800 to-cyan-900',
      tag: '🤖 AI Smart Paste',
      title: 'เพิ่มทรัพย์ใน\n10 วินาที',
      subtitle: 'วาง Line ข้อความ — AI เติมข้อมูลให้อัตโนมัติ',
      showSearch: false,
    },
    {
      type: 'gradient',
      gradient: 'from-violet-900 via-purple-800 to-indigo-900',
      tag: '📄 PDF ภาษาไทยครบชุด',
      title: 'สัญญาครบ 9 ประเภท\nพร้อมลายเซ็นดิจิทัล',
      subtitle: 'ออกสัญญาเช่า จอง ใบเสร็จ คอมมิชชัน ได้ในคลิกเดียว',
      showSearch: false,
    },
  ]
  const dbSlides: HeroSlide[] = (bannerRows ?? []).map(b =>
    b.image_url
      ? {
          type: 'image' as const,
          imageUrl: b.image_url,
          linkUrl: b.link_url ?? undefined,
          title: b.title ?? undefined,
          subtitle: (b as { subtitle?: string }).subtitle ?? undefined,
          tag: (b as { tag?: string }).tag ?? undefined,
          showSearch: (b as { show_search?: boolean }).show_search ?? true,
        }
      : {
          type: 'gradient' as const,
          gradient: (b as { gradient?: string }).gradient ?? 'from-[#0f2044] via-[#1a3a6e] to-[#0e3460]',
          title: b.title ?? undefined,
          subtitle: (b as { subtitle?: string }).subtitle ?? undefined,
          tag: (b as { tag?: string }).tag ?? undefined,
          showSearch: (b as { show_search?: boolean }).show_search ?? true,
          linkUrl: b.link_url ?? undefined,
        }
  )
  const slides = dbSlides.length > 0 ? dbSlides : FALLBACK_SLIDES

  // Compute provinces list for hero search dropdowns
  const provinceCounts = new Map<string, number>()
  for (const r of (projectRows ?? [])) {
    if (r.province) provinceCounts.set(r.province, (provinceCounts.get(r.province) ?? 0) + 1)
  }
  const provinces = [...provinceCounts.keys()].sort()

  // Compute Bangkok district counts for "ทำเลยอดนิยม"
  const districtCounts = new Map<string, number>()
  for (const r of (bkkDistrictRows ?? [])) {
    if (r.district) districtCounts.set(r.district, (districtCounts.get(r.district) ?? 0) + 1)
  }
  const topDistricts = [...districtCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)

  const btsMrtOptions = [...new Set(
    (projectRows ?? []).flatMap((r: { bts_mrt?: string[] }) => r.bts_mrt ?? []).filter(Boolean)
  )].sort() as string[]

  const heroVideo  = featuredVideos?.[0] ?? null
  const heroVideoId = heroVideo ? extractYouTubeId(heroVideo.youtube_url) : null

  return (
    <div className="min-h-screen bg-gray-50 overflow-x-hidden">
      <PublicNav />

      {/* ────────────────────────── Hero ────────────────────────── */}
      <HomeHeroClient slides={slides} provinces={provinces} btsMrtOptions={btsMrtOptions} />

      {/* ─────────────────── Bangkok District Cards ──────────────── */}
      {topDistricts.length > 0 && (
        <div className="bg-white py-10 border-b border-gray-100">
          <div className="max-w-6xl mx-auto px-4">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-lg font-bold text-gray-900">ทำเลยอดนิยม</h2>
                <p className="text-xs text-gray-400 mt-0.5">เขตในกรุงเทพมหานคร</p>
              </div>
              <Link
                href="/listing?province=%E0%B8%81%E0%B8%A3%E0%B8%B8%E0%B8%87%E0%B9%80%E0%B8%97%E0%B8%9E%E0%B8%A1%E0%B8%AB%E0%B8%B2%E0%B8%99%E0%B8%84%E0%B8%A3"
                className="text-sm text-blue-600 hover:underline flex items-center gap-1"
              >
                ดูทั้งหมด <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
              {topDistricts.map(([district, count]) => (
                <Link
                  key={district}
                  href={`/listing?province=${encodeURIComponent('กรุงเทพมหานคร')}&district=${encodeURIComponent(district)}`}
                  className="flex-shrink-0 w-36 sm:w-40 group"
                >
                  <div className="h-28 rounded-2xl border border-gray-100 bg-white shadow-sm hover:shadow-md hover:border-blue-200 transition-all flex flex-col items-center justify-center gap-2 px-3 text-center">
                    <div className="w-10 h-10 rounded-full bg-blue-50 group-hover:bg-blue-100 transition-colors flex items-center justify-center flex-shrink-0">
                      <MapPin className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-800 leading-tight">{district}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{count.toLocaleString('th-TH')} โครงการ</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────── Property Types ──────────────────────── */}
      <div className="bg-white py-10 border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-lg font-bold text-gray-900 mb-5">ค้นหาตามประเภทห้อง</h2>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            {ROOM_TYPE_TILES.map(({ value, label, Icon }) => (
              <Link
                key={value}
                href={value ? `/listing?room_type=${value}` : '/listing'}
                className="flex flex-col items-center gap-2.5 py-5 px-2 rounded-2xl border border-gray-100 bg-white hover:border-blue-200 hover:bg-blue-50/40 hover:shadow-sm active:scale-95 transition-all text-center group"
              >
                <div className="w-11 h-11 rounded-xl bg-gray-50 group-hover:bg-blue-100 transition-colors flex items-center justify-center">
                  <Icon className="w-5 h-5 text-gray-500 group-hover:text-blue-600 transition-colors" />
                </div>
                <span className="text-xs font-semibold text-gray-600 group-hover:text-blue-700 transition-colors leading-tight">{label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* ─────────────── Featured Properties Carousel ─────────────── */}
      {featuredStocks.length > 0 && (
        <div className="py-10">
          <div className="max-w-6xl mx-auto px-4">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-900">ทรัพย์สินแนะนำ</h2>
              <Link href="/listing" className="text-sm text-blue-600 hover:underline flex items-center gap-1">
                ดูทั้งหมด <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            {/* Horizontal scroll on mobile, grid on desktop */}
            <div className="flex gap-4 overflow-x-auto pb-3 scrollbar-none snap-x snap-mandatory lg:grid lg:grid-cols-4 lg:overflow-visible lg:pb-0">
              {featuredStocks.map(stock => (
                <div key={stock.id} className="flex-shrink-0 w-72 sm:w-80 snap-start lg:w-auto">
                  <PropertyCard stock={stock} />
                </div>
              ))}
            </div>
            {/* CTA */}
            <div className="mt-6 text-center">
              <Link
                href="/listing"
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-2xl transition shadow-sm active:scale-95"
              >
                <Building2 className="w-4 h-4" />
                ดูอสังหาริมทรัพย์ทั้งหมด
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────── Animated Stats ──────────────────────── */}
      <StatsCounter stats={[
        { value: contractCount ?? 0, label: 'สัญญาที่ออกแล้ว', unit: 'ฉบับ',   icon: FileText },
        { value: agentCount   ?? 0, label: 'เอเจนต์ที่ใช้งาน', unit: 'คน',     icon: User },
        { value: stockCount   ?? 0, label: 'ทรัพย์ในระบบ',     unit: 'รายการ', icon: Home },
        { value: 9,                  label: 'ประเภทสัญญา',      unit: 'ประเภท', icon: ClipboardList },
      ]} />

      {/* ─────────────────── Banner strip ────────────────────────── */}
      <BannerStrip position="listing_top" />

      {/* ────────────── For Agents CTA Banner ────────────────────── */}
      <div className="bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 py-14">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <span className="inline-block bg-white/15 backdrop-blur-sm text-white text-xs font-medium px-4 py-1.5 rounded-full border border-white/20 mb-5">
            🤝 สำหรับเอเจนต์อสังหาฯ
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">
            จัดการทรัพย์ ออกสัญญา<br className="hidden sm:block" /> ทุกอย่างในที่เดียว
          </h2>
          <p className="text-white/75 text-sm sm:text-base mb-8 max-w-xl mx-auto leading-relaxed">
            AI Smart Paste · สัญญา PDF ครบ 9 ประเภท · ลายเซ็นดิจิทัล · รายงานคอมมิชชัน<br />
            ทดลองใช้ฟรี ไม่ต้องใช้บัตรเครดิต
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/register"
              className="inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-white text-blue-700 font-bold rounded-2xl transition hover:bg-blue-50 active:scale-95 text-sm shadow-lg"
            >
              <Star className="w-4 h-4" />
              ลงทะเบียนฟรี
            </Link>
            <Link
              href="/services"
              className="inline-flex items-center justify-center gap-2 px-8 py-3.5 border-2 border-white/40 text-white font-semibold rounded-2xl transition hover:bg-white/10 active:scale-95 text-sm"
            >
              ดูแพ็กเกจและราคา
            </Link>
          </div>
        </div>
      </div>

      {/* ─────────────────── YouTube Video ───────────────────────── */}
      {heroVideoId && (
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
              <Link href="/videos" className="text-sm text-gray-400 hover:text-white transition">ดูวิดีโอทั้งหมด →</Link>
            </p>
          </div>
        </div>
      )}

      {/* ─────────────────── Partners ────────────────────────────── */}
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
                return p.website
                  ? <a key={p.id} href={p.website} target="_blank" rel="noopener noreferrer">{inner}</a>
                  : <div key={p.id}>{inner}</div>
              })}
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────── Articles ────────────────────────────── */}
      {(latestArticles?.length ?? 0) > 0 && (
        <div className="max-w-6xl mx-auto px-4 py-10">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-gray-900">บทความ & คู่มือ</h2>
            <Link href="/articles" className="text-sm text-blue-600 hover:underline">ดูทั้งหมด →</Link>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {latestArticles!.map(a => (
              <Link
                key={a.id}
                href={`/articles/${a.slug}`}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-2 hover:shadow-md transition group"
              >
                <span className={`self-start text-xs font-semibold px-2 py-0.5 rounded-full ${ARTICLE_CATEGORY_COLORS[a.category] ?? 'bg-gray-100 text-gray-600'}`}>
                  {ARTICLE_CATEGORY_LABELS[a.category] ?? a.category}
                </span>
                <p className="text-sm font-semibold text-gray-900 leading-snug group-hover:text-blue-700 transition-colors">{a.title}</p>
                {a.excerpt && <p className="text-xs text-gray-500 leading-relaxed flex-1 line-clamp-3">{a.excerpt}</p>}
                <span className="text-xs text-blue-600 font-medium mt-1">อ่านต่อ →</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ─────────────────── News ────────────────────────────────── */}
      {(latestNews?.length ?? 0) > 0 && (
        <div className="max-w-6xl mx-auto px-4 pb-12">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Newspaper className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-bold text-gray-900">ข่าวสาร & อัปเดต</h2>
            </div>
            <Link href="/news" className="text-sm text-blue-600 hover:underline">ดูทั้งหมด →</Link>
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            {latestNews!.map(n => (
              <Link
                key={n.id}
                href={`/news/${n.id}`}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition block group"
              >
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
                  <p className="text-sm font-semibold text-gray-900 line-clamp-2 mb-1 group-hover:text-blue-700 transition-colors">{n.title}</p>
                  {n.summary && <p className="text-xs text-gray-400 line-clamp-2">{n.summary}</p>}
                  <p className="text-xs text-gray-300 mt-2">
                    {new Date(n.created_at).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      <PublicFooter />
      <CompareBar />
    </div>
  )
}
