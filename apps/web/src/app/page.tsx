import Link from 'next/link'
import Image from 'next/image'
import { Building2, Maximize, Layers, MapPin } from 'lucide-react'
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
  searchParams: Promise<{ listing_type?: string; room_type?: string; province?: string; price_bucket?: string }>
}) {
  const { listing_type, room_type, province, price_bucket } = await searchParams

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Fetch available provinces for the filter
  const { data: provinceRows } = await supabase
    .from('stock')
    .select('project:projects(province)')
    .eq('status', 'available')
    .not('project_id', 'is', null)

  const provinces = [...new Set(
    (provinceRows ?? [])
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((r: any) => r.project?.province as string | undefined)
      .filter((p): p is string => !!p)
  )].sort()

  let query = supabase
    .from('stock')
    .select('id, unit_no, room_type, size_sqm, floor, rent_price, sale_price, listing_type, photo_urls, project_name, project_id, project:projects(province, district)')
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
  type StockWithProject = Stock & { project?: { province?: string; district?: string } | null }
  let stocks = (stocksRaw ?? []) as unknown as StockWithProject[]

  if (province && province !== 'all') {
    stocks = stocks.filter(s => s.project?.province === province)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white border-b border-gray-100 sticky top-0 z-10 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-600" />
            <span className="font-bold text-lg text-gray-900">Proppsy</span>
          </Link>
          <div className="flex items-center gap-3">
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

      {/* Hero */}
      <div className="bg-gradient-to-br from-blue-700 to-blue-900 text-white py-10 px-4 text-center">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">ค้นหาที่พักในฝัน</h1>
        <p className="text-blue-200 text-sm">ทรัพย์สินคุณภาพในประเทศไทย พร้อมเอเจนต์มืออาชีพ</p>
      </div>

      {/* Filter bar */}
      <div className="bg-white border-b border-gray-100 shadow-sm sticky top-14 z-10">
        <div className="max-w-6xl mx-auto px-4 py-2.5">
          <FilterBar
            currentListingType={listing_type ?? 'all'}
            currentRoomType={room_type ?? 'all'}
            currentProvince={province ?? 'all'}
            currentPriceBucket={price_bucket ?? 'all'}
            provinces={provinces}
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

      {/* Footer */}
      <footer className="border-t border-gray-100 mt-8 py-8 text-center text-xs text-gray-400">
        © {new Date().getFullYear()} Proppsy · Real Estate Management Platform
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
