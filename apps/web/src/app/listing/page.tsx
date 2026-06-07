import type { Metadata } from 'next'
import { createServiceClient } from '@/lib/supabase/server'
import PublicNav from '@/components/shared/PublicNav'
import PublicFooter from '@/components/shared/PublicFooter'
import ListingPageClient, { type FilterState } from './ListingPageClient'
import type { StockWithProject } from './PropertyCard'
import StatsCounter from './StatsCounter'
import { BannerStrip } from '@/components/shared/BannerZone'

export const metadata: Metadata = {
  title: 'อสังหาริมทรัพย์ทั้งหมด — Proppsy',
  description: 'ค้นหาคอนโด บ้าน ทาวน์เฮ้าส์ให้เช่าและขายทั่วประเทศไทย กรองตามราคา ทำเล BTS/MRT',
}

const PAGE_SIZE = 24

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

export default async function ListingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const params = await searchParams

  const q            = params.q?.trim() ?? ''
  const listing_type = params.listing_type ?? 'all'
  const room_type    = params.room_type    ?? 'all'
  const province     = params.province     ?? 'all'
  const bts_mrt      = params.bts_mrt      ?? 'all'
  const price_bucket = params.price_bucket ?? 'all'
  const status       = params.status       ?? 'available'
  const sort         = params.sort         ?? 'newest'
  const page         = Math.max(1, parseInt(params.page ?? '1'))
  const from         = (page - 1) * PAGE_SIZE
  const to           = from + PAGE_SIZE - 1

  const supabase = createServiceClient()

  // Filter options + real stats — always fetch all, not filtered by current selection
  const [
    { data: projectRows },
    { data: roomTypeRows },
    { count: contractCount },
    { count: agentCount },
    { count: stockCount },
  ] = await Promise.all([
    supabase.from('projects').select('id, province, bts_mrt'),
    supabase.from('stock').select('room_type').not('room_type', 'is', null).eq('is_published', true),
    supabase.from('contracts').select('*', { count: 'exact', head: true }),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('account_status', 'approved'),
    supabase.from('stock').select('*', { count: 'exact', head: true }).eq('is_published', true),
  ])

  const siteStats = [
    { value: contractCount ?? 0, label: 'สัญญาที่ออกแล้ว', unit: 'ฉบับ',   icon: '📄' },
    { value: agentCount   ?? 0, label: 'เอเจนต์ที่ใช้งาน', unit: 'คน',     icon: '👤' },
    { value: stockCount   ?? 0, label: 'ทรัพย์ในระบบ',    unit: 'รายการ',  icon: '🏠' },
    { value: 9,                  label: 'ประเภทสัญญา',     unit: 'ประเภท',  icon: '📋' },
  ]

  const provinces = [...new Set(
    (projectRows ?? []).map(r => r.province as string | null).filter((p): p is string => !!p)
  )].sort()

  const btsMrtOptions = [...new Set(
    (projectRows ?? []).flatMap(r => (r.bts_mrt as string[] | null) ?? []).filter(Boolean)
  )].sort() as string[]

  const roomTypes = [...new Set(
    (roomTypeRows ?? []).map(r => r.room_type as string | null).filter((t): t is string => !!t)
  )].sort()

  // Two-step query for province / BTS filter (these live on the projects table)
  let projectIds: string[] | null = null
  if ((province && province !== 'all') || (bts_mrt && bts_mrt !== 'all')) {
    let pq = supabase.from('projects').select('id')
    if (province && province !== 'all') pq = pq.eq('province', province)
    if (bts_mrt && bts_mrt !== 'all') pq = pq.contains('bts_mrt', [bts_mrt])
    const { data: pMatches } = await pq.limit(10000)
    projectIds = pMatches?.map(p => p.id as string) ?? []
  }

  let stocks: StockWithProject[] = []
  let totalCount = 0

  // Skip DB query if location filter yields no matching projects
  if (projectIds === null || projectIds.length > 0) {
    let stockQuery = supabase
      .from('stock')
      .select(
        'id, unit_no, project_name, project_id, room_type, size_sqm, floor, rent_price, sale_price, listing_type, status, is_premium, photo_urls, photo_thumb_urls, project:projects(province, district, bts_mrt)',
        { count: 'exact' }
      )
      .eq('is_published', true)

    // Status filter
    if (!status || status === 'available') {
      stockQuery = stockQuery.eq('status', 'available')
    } else if (status !== 'all') {
      stockQuery = stockQuery.eq('status', status)
    }

    // Keyword (project name)
    if (q) stockQuery = stockQuery.ilike('project_name', `%${q}%`)

    // Listing type
    if (listing_type === 'rent')       stockQuery = stockQuery.or('listing_type.eq.rent,listing_type.eq.both')
    else if (listing_type === 'sale')  stockQuery = stockQuery.or('listing_type.eq.sale,listing_type.eq.both')

    // Room type
    if (room_type && room_type !== 'all') stockQuery = stockQuery.eq('room_type', room_type)

    // Price bucket
    if (price_bucket && price_bucket !== 'all') {
      const ranges = listing_type === 'sale' ? SALE_RANGES : RENT_RANGES
      const range = ranges[price_bucket]
      if (range) {
        if (listing_type === 'sale') stockQuery = stockQuery.gte('sale_price', range[0]).lte('sale_price', range[1])
        else                         stockQuery = stockQuery.gte('rent_price',  range[0]).lte('rent_price',  range[1])
      }
    }

    // Project IDs (location filter, already resolved above)
    if (projectIds !== null && projectIds.length > 0) {
      stockQuery = stockQuery.in('project_id', projectIds)
    }

    // Sort
    if (sort === 'price_asc') {
      const col = listing_type === 'sale' ? 'sale_price' : 'rent_price'
      stockQuery = stockQuery.order(col, { ascending: true, nullsFirst: false })
    } else if (sort === 'price_desc') {
      const col = listing_type === 'sale' ? 'sale_price' : 'rent_price'
      stockQuery = stockQuery.order(col, { ascending: false, nullsFirst: false })
    } else {
      stockQuery = stockQuery
        .order('is_premium', { ascending: false })
        .order('published_at', { ascending: false, nullsFirst: false })
    }

    // Paginate
    stockQuery = stockQuery.range(from, to)

    const { data, count } = await stockQuery
    stocks     = (data ?? []) as unknown as StockWithProject[]
    totalCount = count ?? 0
  }

  const currentFilters: FilterState = {
    q,
    listing_type,
    room_type,
    province,
    bts_mrt,
    price_bucket,
    status,
    sort,
    page: String(page),
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 1. Navbar */}
      <PublicNav />

      {/* 2. Proppsy Statistics — real system stats give credibility before banner/listings */}
      <StatsCounter stats={siteStats} />

      {/* 3. Listing Banner */}
      <BannerStrip position="listing_top" />

      {/* 4. Property Filters + 5. Property Listings */}
      <div className="bg-white border-b border-gray-100 px-4 py-3.5">
        <h1 className="text-base font-bold text-gray-900">อสังหาริมทรัพย์ทั้งหมด</h1>
        <p className="text-xs text-gray-400 mt-0.5">เช่า-ขาย คอนโด บ้าน ทาวน์เฮ้าส์ ทั่วประเทศไทย</p>
      </div>
      <ListingPageClient
        stocks={stocks}
        totalCount={totalCount}
        currentPage={page}
        pageSize={PAGE_SIZE}
        filterOptions={{ provinces, btsMrtOptions, roomTypes }}
        currentFilters={currentFilters}
      />

      {/* 6. Footer */}
      <PublicFooter />
    </div>
  )
}
