import Link from 'next/link'
import Image from 'next/image'
import StorageImage from '@/components/shared/StorageImage'
import { Building2, Maximize, Layers, MapPin, Newspaper, Play } from 'lucide-react'
import { Suspense } from 'react'
import type { Metadata } from 'next'
import { createServiceClient } from '@/lib/supabase/server'
import type { Stock } from '@/types'
import PublicNav from '@/components/shared/PublicNav'
import FilterBar from './listing/FilterBar'
import HeroBanner from './listing/HeroBanner'
import StatsCounter from './listing/StatsCounter'

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

// ── เปลี่ยน YouTube Video ID ที่นี่ ──────────────────────────
const YOUTUBE_ID = '16IweHfUBa4'

const RENT_RANGES: Record<string, [number, number]> = {
  low:     [0,     15000],
  mid:     [15000, 30000],
  high:    [30000, 60000],
  premium: [60000, 999999999],
}
const SALE_RANGES: Record<string, [number, number]> = {
  low:     [0,          2000000],
  mid:     [2000000,    5000000],
  high:    [5000000,    10000000],
  premium: [10000000,   999999999],
}

function fmt(n: number) {
  return new Intl.NumberFormat('th-TH').format(n)
}

// ── ลูกค้าที่ใช้บริการ (เปลี่ยนได้) ──────────────────────────
const CLIENTS = [
  'บริษัท เอบีซี พร็อพเพอร์ตี้',
  'Plus Real Estate',
  'ทีม KPN Realty',
  'บริษัท ไทยแลนด์ โฮม',
  'SmartAgent Group',
  'Prestige Properties',
]

// ── บทความ IT / PropTech ──────────────────────────────────────
const IT_ARTICLES = [
  {
    tag: 'AI & PropTech',
    title: 'AI เปลี่ยนวงการอสังหาฯ ไทยอย่างไรในปี 2025',
    desc: 'เทคโนโลยี AI กำลังปฏิวัติการทำงานของเอเจนต์ ตั้งแต่การวิเคราะห์ข้อมูล ไปจนถึงการออกเอกสารอัตโนมัติ',
    color: 'blue',
  },
  {
    tag: 'ลายเซ็นดิจิทัล',
    title: 'ลายเซ็นอิเล็กทรอนิกส์ vs ลายเซ็นมือ: อะไรถูกกฎหมาย?',
    desc: 'พระราชบัญญัติธุรกรรมทางอิเล็กทรอนิกส์ พ.ศ. 2544 รองรับลายเซ็นดิจิทัล สำหรับสัญญาเช่าและอสังหาริมทรัพย์',
    color: 'green',
  },
  {
    tag: 'เอกสาร & PDF',
    title: 'ทำไมเอเจนต์ยุคใหม่ถึงเลิกใช้ Word สร้างสัญญา',
    desc: 'ระบบ PDF อัตโนมัติช่วยลดข้อผิดพลาด ประหยัดเวลา และให้ภาพลักษณ์ที่เป็นมืออาชีพมากขึ้น',
    color: 'purple',
  },
  {
    tag: 'Cloud & Mobile',
    title: 'จัดการทรัพย์อสังหาฯ บนมือถือ: คู่มือฉบับสมบูรณ์',
    desc: 'เครื่องมือ Cloud-based ช่วยให้เอเจนต์ทำงานได้ทุกที่ เข้าถึงข้อมูลลูกค้าและทรัพย์แบบ real-time',
    color: 'orange',
  },
]

const COLOR_MAP: Record<string, string> = {
  blue:   'bg-blue-50 text-blue-700',
  green:  'bg-green-50 text-green-700',
  purple: 'bg-purple-50 text-purple-700',
  orange: 'bg-orange-50 text-orange-700',
}

export default async function PublicListingPage({
  searchParams,
}: {
  searchParams: Promise<{ listing_type?: string; room_type?: string; province?: string; district?: string; bts_mrt?: string; price_bucket?: string; q?: string }>
}) {
  const { listing_type, room_type, province, district, bts_mrt, price_bucket, q } = await searchParams

  const supabase = createServiceClient()

  const [{ data: projectRows }, { data: latestNews }] = await Promise.all([
    supabase.from('projects').select('province, district, bts_mrt').not('province', 'is', null),
    supabase.from('news').select('id, title, summary, cover_url, created_at').eq('published', true).order('created_at', { ascending: false }).limit(3),
  ])

  const provinces = [...new Set((projectRows ?? []).map((r: { province?: string }) => r.province).filter((p): p is string => !!p))].sort()
  const districts = [...new Set((projectRows ?? []).filter(r => !province || province === 'all' || r.province === province).map((r: { district?: string }) => r.district).filter((d): d is string => !!d))].sort()
  const btsMrtOptions = [...new Set((projectRows ?? []).flatMap((r: { bts_mrt?: string[] }) => r.bts_mrt ?? []).filter(Boolean))].sort()

  let query = supabase
    .from('stock')
    .select('id, unit_no, room_type, size_sqm, floor, rent_price, sale_price, listing_type, photo_urls, photo_thumb_urls, project_name, project_id, is_premium, project:projects(province, district, bts_mrt)')
    .eq('status', 'available')
    .eq('is_published', true)
    .order('is_premium', { ascending: false })
    .order('published_at', { ascending: false })

  if (q && q.trim()) query = query.ilike('project_name', `%${q.trim()}%`)
  if (listing_type === 'rent') query = query.or('listing_type.eq.rent,listing_type.eq.both')
  else if (listing_type === 'sale') query = query.or('listing_type.eq.sale,listing_type.eq.both')
  if (room_type && room_type !== 'all') query = query.eq('room_type', room_type)
  if (price_bucket && price_bucket !== 'all') {
    if (listing_type === 'sale') {
      const range = SALE_RANGES[price_bucket]
      if (range) query = query.gte('sale_price', range[0]).lte('sale_price', range[1])
    } else {
      const range = RENT_RANGES[price_bucket]
      if (range) query = query.gte('rent_price', range[0]).lte('rent_price', range[1])
    }
  }

  const { data: stocksRaw } = await query
  type StockWithProject = Stock & { project?: { province?: string; district?: string; bts_mrt?: string[] } | null }
  let stocks = (stocksRaw ?? []) as unknown as StockWithProject[]

  if (province && province !== 'all') stocks = stocks.filter(s => s.project?.province === province)
  if (district && district !== 'all') stocks = stocks.filter(s => s.project?.district === district)
  if (bts_mrt && bts_mrt !== 'all') stocks = stocks.filter(s => s.project?.bts_mrt?.includes(bts_mrt))

  return (
    <div className="min-h-screen bg-gray-50 overflow-x-hidden">
      <PublicNav />

      {/* ── Sliding Hero Banner ── */}
      <Suspense fallback={
        <div className="bg-blue-800 min-h-[280px] flex items-center justify-center">
          <div className="animate-pulse text-white/40 text-sm">กำลังโหลด...</div>
        </div>
      }>
        <HeroBanner currentQ={q ?? ''} />
      </Suspense>

      {/* ── Filter bar ── */}
      <div className="bg-white border-b border-gray-100 shadow-sm sticky top-14 z-10">
        <div className="max-w-6xl mx-auto px-4 py-2.5">
          <FilterBar
            currentListingType={listing_type ?? 'all'}
            currentRoomType={room_type ?? 'all'}
            currentProvince={province ?? 'all'}
            currentDistrict={district ?? 'all'}
            currentBtsMrt={bts_mrt ?? 'all'}
            currentPriceBucket={price_bucket ?? 'all'}
            provinces={provinces}
            districts={districts}
            btsMrtOptions={btsMrtOptions}
          />
        </div>
      </div>

      {/* ── Property Grid ── */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        <p className="text-sm text-gray-500 mb-4">
          {q && q.trim() && (
            <span>ค้นหา &ldquo;<span className="font-semibold text-gray-900">{q}</span>&rdquo; · </span>
          )}
          พบ <span className="font-semibold text-gray-900">{stocks.length}</span> รายการ
          {province && province !== 'all' && ` ใน${province}`}
          {price_bucket && price_bucket !== 'all' && ' · กรองตามราคา'}
        </p>
        {stocks.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {stocks.map(stock => (
              <PropertyCard key={stock.id} stock={stock} />
            ))}
          </div>
        ) : (
          <div className="text-center py-24 text-gray-400">
            <Building2 className="w-14 h-14 mx-auto mb-3 opacity-25" />
            <p className="text-sm">ไม่พบทรัพย์สินที่ตรงกับเงื่อนไข</p>
            <Link href="/" className="text-xs text-blue-500 mt-2 inline-block">ล้างตัวกรอง</Link>
          </div>
        )}
      </div>

      {/* ── Animated Stats ── */}
      <StatsCounter />

      {/* ── YouTube Section ── */}
      {YOUTUBE_ID ? (
        <div className="bg-gray-900 py-12">
          <div className="max-w-4xl mx-auto px-4">
            <p className="text-center text-gray-400 text-xs font-medium uppercase tracking-widest mb-3">วิดีโอแนะนำ</p>
            <h2 className="text-center text-white text-xl font-bold mb-6">ดูการใช้งาน Proppsy</h2>
            <div className="relative aspect-video rounded-2xl overflow-hidden shadow-2xl">
              <iframe
                src={`https://www.youtube.com/embed/${YOUTUBE_ID}?rel=0`}
                title="Proppsy Demo"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="absolute inset-0 w-full h-full"
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-gray-900 py-12">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <div className="border-2 border-dashed border-gray-600 rounded-2xl p-16 flex flex-col items-center gap-4">
              <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center">
                <Play className="w-7 h-7 text-white fill-white" />
              </div>
              <p className="text-white font-semibold">วิดีโอแนะนำ Proppsy</p>
              <p className="text-gray-400 text-sm">ตั้งค่า YOUTUBE_ID ใน apps/web/src/app/page.tsx</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Trust / Clients ── */}
      <div className="bg-white py-10 border-y border-gray-100">
        <div className="max-w-6xl mx-auto px-4">
          <p className="text-center text-gray-400 text-xs font-medium uppercase tracking-widest mb-6">
            เชื่อใจโดยเอเจนต์และบริษัทอสังหาฯ ชั้นนำ
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {CLIENTS.map(name => (
              <span key={name} className="px-4 py-2 bg-gray-50 border border-gray-100 rounded-full text-sm text-gray-600 font-medium">
                {name}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── IT Knowledge Articles ── */}
      <div className="max-w-6xl mx-auto px-4 py-10">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-gray-900">บทความ PropTech & IT</h2>
          <Link href="/news" className="text-sm text-blue-600 hover:underline">ดูทั้งหมด →</Link>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {IT_ARTICLES.map(a => (
            <div key={a.title} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex flex-col gap-2 hover:shadow-md transition">
              <span className={`self-start text-xs font-semibold px-2 py-0.5 rounded-full ${COLOR_MAP[a.color]}`}>
                {a.tag}
              </span>
              <p className="text-sm font-semibold text-gray-900 leading-snug">{a.title}</p>
              <p className="text-xs text-gray-500 leading-relaxed flex-1">{a.desc}</p>
            </div>
          ))}
        </div>
      </div>

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

      {/* ── Footer ── */}
      <footer className="border-t border-gray-100 py-8">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-400">
          <div className="flex items-center gap-2">
            <Image src="/logo/logo-icon.jpg" alt="Proppsy" width={20} height={20} className="object-contain rounded" />
            <span>© {new Date().getFullYear()} Proppsy · Real Estate Management Platform</span>
          </div>
          <div className="flex items-center gap-4 flex-wrap justify-center sm:justify-end">
            <Link href="/guide" className="hover:text-gray-600 transition">คู่มือ</Link>
            <Link href="/faq" className="hover:text-gray-600 transition">FAQ</Link>
            <Link href="/services" className="hover:text-gray-600 transition">บริการ</Link>
            <Link href="/news" className="hover:text-gray-600 transition">ข่าวสาร</Link>
            <Link href="/about" className="hover:text-gray-600 transition">เกี่ยวกับเรา</Link>
            <Link href="/contact" className="hover:text-gray-600 transition">ติดต่อเรา</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}

function PropertyCard({ stock }: { stock: Stock & { project?: { province?: string; district?: string } | null } }) {
  const photo = stock.photo_thumb_urls?.[0] ?? stock.photo_urls?.[0]
  const isRent = stock.listing_type !== 'sale'
  const isSale = stock.listing_type !== 'rent'
  const price = stock.listing_type === 'sale' ? stock.sale_price : stock.rent_price
  const location = [stock.project?.district, stock.project?.province].filter(Boolean).join(', ')

  return (
    <Link
      href={`/listing/${stock.id}`}
      className={`group bg-white rounded-2xl overflow-hidden border shadow-sm hover:shadow-md transition-shadow block ${
        stock.is_premium ? 'border-orange-200 ring-1 ring-orange-200' : 'border-gray-100'
      }`}
    >
      <div className="relative aspect-[4/3] bg-gray-100">
        <StorageImage
          src={photo}
          alt={stock.project_name ?? 'ทรัพย์'}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-300"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          fallback={
            <div className="absolute inset-0 flex items-center justify-center">
              <Building2 className="w-12 h-12 text-gray-200" />
            </div>
          }
        />
        <div className="absolute top-2 left-2 flex gap-1">
          {isRent && <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-blue-500/90 text-white backdrop-blur-sm">เช่า</span>}
          {isSale && stock.listing_type !== 'rent' && <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-green-500/90 text-white backdrop-blur-sm">ขาย</span>}
        </div>
        {stock.is_premium && (
          <span
            className="absolute top-2 right-2 text-[11px] px-2.5 py-0.5 rounded-full font-bold text-white animate-hot-glow"
            style={{ background: 'linear-gradient(135deg, #f97316 0%, #ef4444 100%)' }}
          >
            HOT
          </span>
        )}
      </div>
      <div className="p-4">
        {price != null && (
          <p className="text-xl font-bold text-gray-900">
            ฿{fmt(price)}
            {stock.listing_type !== 'sale' && <span className="text-sm font-normal text-gray-400">/เดือน</span>}
          </p>
        )}
        <p className="text-sm font-medium text-gray-700 mt-0.5 truncate">{stock.project_name ?? 'ไม่ระบุโครงการ'}</p>
        {location && (
          <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
            <MapPin className="w-3 h-3 flex-shrink-0" />{location}
          </p>
        )}
        <div className="flex items-center gap-2 mt-2 text-xs text-gray-400 flex-wrap">
          {stock.room_type && <span className="bg-gray-50 px-2 py-0.5 rounded-full border border-gray-100">{stock.room_type}</span>}
          {stock.size_sqm && <span className="flex items-center gap-0.5"><Maximize className="w-3 h-3" />{stock.size_sqm} ตร.ม.</span>}
          {stock.floor && <span className="flex items-center gap-0.5"><Layers className="w-3 h-3" />ชั้น {stock.floor}</span>}
        </div>
      </div>
    </Link>
  )
}
