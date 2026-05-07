import Link from 'next/link'
import Image from 'next/image'
import { Building2, Maximize, Layers, MapPin, Newspaper } from 'lucide-react'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import type { Stock } from '@/types'
import FilterBar from './listing/FilterBar'

export const metadata: Metadata = { title: 'Proppsy — ค้นหาที่พัก' }

function fmt(n: number) {
  return new Intl.NumberFormat('th-TH').format(n)
}

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

export default async function PublicListingPage({
  searchParams,
}: {
  searchParams: Promise<{ listing_type?: string; room_type?: string; province?: string; district?: string; bts_mrt?: string; price_bucket?: string }>
}) {
  const { listing_type, room_type, province, district, bts_mrt, price_bucket } = await searchParams

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Fetch filter options + latest news in parallel
  const [{ data: projectRows }, { data: latestNews }] = await Promise.all([
    supabase
      .from('projects')
      .select('province, district, bts_mrt')
      .not('province', 'is', null),
    supabase
      .from('news')
      .select('id, title, summary, created_at')
      .eq('published', true)
      .order('created_at', { ascending: false })
      .limit(3),
  ])

  const provinces = [...new Set((projectRows ?? []).map((r: { province?: string }) => r.province).filter((p): p is string => !!p))].sort()
  const districts = [...new Set((projectRows ?? []).filter(r => !province || province === 'all' || r.province === province).map((r: { district?: string }) => r.district).filter((d): d is string => !!d))].sort()
  const btsMrtOptions = [...new Set((projectRows ?? []).flatMap((r: { bts_mrt?: string[] }) => r.bts_mrt ?? []).filter(Boolean))].sort()

  let query = supabase
    .from('stock')
    .select('id, unit_no, room_type, size_sqm, floor, rent_price, sale_price, listing_type, photo_urls, project_name, project_id, project:projects(province, district, bts_mrt)')
    .eq('status', 'available')
    .order('created_at', { ascending: false })

  if (listing_type === 'rent') {
    query = query.or('listing_type.eq.rent,listing_type.eq.both')
  } else if (listing_type === 'sale') {
    query = query.or('listing_type.eq.sale,listing_type.eq.both')
  }
  if (room_type && room_type !== 'all') {
    query = query.eq('room_type', room_type)
  }
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
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white border-b border-gray-100 sticky top-0 z-10 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-2 flex-shrink-0">
            <Image src="/logo/logo-icon.jpg" alt="Proppsy" width={28} height={28} className="object-contain rounded-lg" />
            <span className="font-bold text-lg text-gray-900">Proppsy</span>
          </Link>
          <div className="hidden md:flex items-center gap-5 text-sm text-gray-600">
            <Link href="/news" className="hover:text-gray-900 transition">ข่าวสาร</Link>
            <Link href="/about" className="hover:text-gray-900 transition">เกี่ยวกับเรา</Link>
            <Link href="/contact" className="hover:text-gray-900 transition">ติดต่อเรา</Link>
          </div>
          <div className="flex items-center gap-2">
            {user ? (
              <Link href="/dashboard" className="px-4 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition">
                แดชบอร์ด
              </Link>
            ) : (
              <>
                <Link href="/login" className="text-sm text-gray-600 hover:text-gray-900 transition hidden sm:block">
                  เข้าสู่ระบบ
                </Link>
                <Link href="/register" className="px-4 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition">
                  สมัครเป็นเอเจนต์
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Banner */}
      <div className="relative bg-gradient-to-br from-blue-800 via-blue-700 to-indigo-800 text-white overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.4\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")', backgroundRepeat: 'repeat' }} />
        </div>
        <div className="relative max-w-6xl mx-auto px-4 py-12 sm:py-16 text-center">
          <div className="flex justify-center mb-4">
            <Image src="/logo/logo-icon.jpg" alt="Proppsy" width={56} height={56} className="object-contain rounded-2xl shadow-lg" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold mb-3">ค้นหาที่พักในฝัน</h1>
          <p className="text-blue-200 text-sm sm:text-base max-w-lg mx-auto">
            ทรัพย์สินคุณภาพในประเทศไทย พร้อมเอเจนต์มืออาชีพดูแลคุณตลอด 24 ชั่วโมง
          </p>
        </div>
      </div>

      {/* Filter bar */}
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

      {/* Grid */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        <p className="text-sm text-gray-500 mb-4">
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

      {/* News Section */}
      {(latestNews?.length ?? 0) > 0 && (
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Newspaper className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-bold text-gray-900">ข่าวสาร & อัปเดต</h2>
            </div>
            <Link href="/news" className="text-sm text-blue-600 hover:underline">ดูทั้งหมด →</Link>
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            {latestNews!.map(n => (
              <Link key={n.id} href={`/news/${n.id}`} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 hover:shadow-md transition block">
                <p className="text-sm font-semibold text-gray-900 line-clamp-2 mb-1">{n.title}</p>
                {n.summary && <p className="text-xs text-gray-400 line-clamp-2">{n.summary}</p>}
                <p className="text-xs text-gray-300 mt-2">{new Date(n.created_at).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })}</p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-gray-100 mt-4 py-8">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-400">
          <div className="flex items-center gap-2">
            <Image src="/logo/logo-icon.jpg" alt="Proppsy" width={20} height={20} className="object-contain rounded" />
            <span>© {new Date().getFullYear()} Proppsy · Real Estate Management Platform</span>
          </div>
          <div className="flex items-center gap-4">
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
  const photo = stock.photo_urls?.[0]
  const isRent = stock.listing_type !== 'sale'
  const isSale = stock.listing_type !== 'rent'
  const price = stock.listing_type === 'sale' ? stock.sale_price : stock.rent_price
  const location = [stock.project?.district, stock.project?.province].filter(Boolean).join(', ')

  return (
    <Link
      href={`/listing/${stock.id}`}
      className="group bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-md transition-shadow block"
    >
      {/* Photo */}
      <div className="relative aspect-[4/3] bg-gray-100">
        {photo ? (
          <Image
            src={photo}
            alt={stock.project_name ?? 'ทรัพย์'}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Building2 className="w-12 h-12 text-gray-200" />
          </div>
        )}
        <div className="absolute top-2 left-2 flex gap-1">
          {isRent && (
            <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-blue-500/90 text-white backdrop-blur-sm">เช่า</span>
          )}
          {isSale && stock.listing_type !== 'rent' && (
            <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-green-500/90 text-white backdrop-blur-sm">ขาย</span>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="p-4">
        {price != null && (
          <p className="text-xl font-bold text-gray-900">
            ฿{fmt(price)}
            {stock.listing_type !== 'sale' && <span className="text-sm font-normal text-gray-400">/เดือน</span>}
          </p>
        )}
        <p className="text-sm font-medium text-gray-700 mt-0.5 truncate">
          {stock.project_name ?? 'ไม่ระบุโครงการ'}
        </p>
        {location && (
          <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
            <MapPin className="w-3 h-3 flex-shrink-0" />
            {location}
          </p>
        )}
        <div className="flex items-center gap-2 mt-2 text-xs text-gray-400 flex-wrap">
          {stock.room_type && (
            <span className="bg-gray-50 px-2 py-0.5 rounded-full border border-gray-100">{stock.room_type}</span>
          )}
          {stock.size_sqm && (
            <span className="flex items-center gap-0.5">
              <Maximize className="w-3 h-3" />
              {stock.size_sqm} ตร.ม.
            </span>
          )}
          {stock.floor && (
            <span className="flex items-center gap-0.5">
              <Layers className="w-3 h-3" />
              ชั้น {stock.floor}
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}
