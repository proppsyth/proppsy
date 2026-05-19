'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Building2, MapPin, Maximize, Layers, Search, X } from 'lucide-react'
import StorageImage from '@/components/shared/StorageImage'

// ── Types ─────────────────────────────────────────────────────

interface StockCard {
  id: string
  unit_no?: string | null
  room_type?: string | null
  size_sqm?: number | null
  floor?: number | string | null
  rent_price?: number | null
  sale_price?: number | null
  listing_type?: string | null
  photo_urls?: string[] | null
  photo_thumb_urls?: string[] | null
  project_name?: string | null
  is_premium?: boolean | null
  project?: { province?: string | null; district?: string | null; bts_mrt?: string[] | null } | null
}

type FilterType = 'all' | 'rent' | 'sale'

interface Props {
  stocks: StockCard[]
}

// ── Helpers ───────────────────────────────────────────────────

function fmt(n: number) {
  return new Intl.NumberFormat('th-TH').format(n)
}

// ── Sub-components ────────────────────────────────────────────

function ListingCard({ stock }: { stock: StockCard }) {
  const photo = stock.photo_thumb_urls?.[0] ?? stock.photo_urls?.[0]
  const isRent = stock.listing_type !== 'sale'
  const isSale = stock.listing_type === 'sale' || stock.listing_type === 'both'
  const price = stock.listing_type === 'sale' ? stock.sale_price : stock.rent_price
  const location = [stock.project?.district, stock.project?.province].filter(Boolean).join(', ')
  const bts = stock.project?.bts_mrt?.slice(0, 2) ?? []

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
              <Building2 className="w-10 h-10 text-gray-200" />
            </div>
          }
        />
        <div className="absolute top-2 left-2 flex gap-1">
          {isRent && stock.listing_type !== 'sale' && (
            <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-blue-500/90 text-white backdrop-blur-sm">เช่า</span>
          )}
          {isSale && (
            <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-green-500/90 text-white backdrop-blur-sm">ขาย</span>
          )}
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
            {stock.listing_type !== 'sale' && (
              <span className="text-sm font-normal text-gray-400">/เดือน</span>
            )}
          </p>
        )}
        <p className="text-sm font-medium text-gray-700 mt-0.5 truncate">
          {stock.project_name ?? 'ไม่ระบุโครงการ'}
          {stock.unit_no && <span className="text-gray-400 font-normal"> · {stock.unit_no}</span>}
        </p>
        {location && (
          <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
            <MapPin className="w-3 h-3 flex-shrink-0" />
            {location}
          </p>
        )}
        {bts.length > 0 && (
          <div className="flex gap-1 mt-1.5 flex-wrap">
            {bts.map(b => (
              <span key={b} className="text-[11px] px-2 py-0.5 bg-purple-50 text-purple-600 rounded-full border border-purple-100">
                {b}
              </span>
            ))}
          </div>
        )}
        <div className="flex items-center gap-2 mt-2 text-xs text-gray-400 flex-wrap">
          {stock.room_type && (
            <span className="bg-gray-50 px-2 py-0.5 rounded-full border border-gray-100">
              {stock.room_type}
            </span>
          )}
          {stock.size_sqm && (
            <span className="flex items-center gap-0.5">
              <Maximize className="w-3 h-3" />{stock.size_sqm} ตร.ม.
            </span>
          )}
          {stock.floor && (
            <span className="flex items-center gap-0.5">
              <Layers className="w-3 h-3" />ชั้น {stock.floor}
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}

// ── Main Component ────────────────────────────────────────────

export default function AgentListingsSection({ stocks }: Props) {
  const [filterType, setFilterType] = useState<FilterType>('all')
  const [query, setQuery] = useState('')

  const rentCount = useMemo(() => stocks.filter(s => s.listing_type !== 'sale').length, [stocks])
  const saleCount = useMemo(() => stocks.filter(s => s.listing_type === 'sale' || s.listing_type === 'both').length, [stocks])

  const filtered = useMemo(() => {
    let list = stocks

    if (filterType === 'rent') list = list.filter(s => s.listing_type !== 'sale')
    else if (filterType === 'sale') list = list.filter(s => s.listing_type === 'sale' || s.listing_type === 'both')

    if (query.trim()) {
      const q = query.trim().toLowerCase()
      list = list.filter(s =>
        (s.project_name ?? '').toLowerCase().includes(q) ||
        (s.project?.district ?? '').toLowerCase().includes(q) ||
        (s.project?.province ?? '').toLowerCase().includes(q) ||
        (s.unit_no ?? '').toLowerCase().includes(q)
      )
    }

    return list
  }, [stocks, filterType, query])

  const FILTERS: { key: FilterType; label: string; count: number }[] = [
    { key: 'all', label: 'ทั้งหมด', count: stocks.length },
    { key: 'rent', label: 'เช่า', count: rentCount },
    { key: 'sale', label: 'ขาย', count: saleCount },
  ]

  return (
    <div>
      {/* Header + filter chips */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
        <h2 className="text-base font-semibold text-gray-700 shrink-0">ประกาศทรัพย์สิน</h2>

        {stocks.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            {FILTERS.map(f => (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilterType(f.key)}
                className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border transition ${
                  filterType === f.key
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
                }`}
              >
                {f.label}
                <span className={`text-[10px] px-1 py-px rounded-full ${
                  filterType === f.key ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-500'
                }`}>
                  {f.count}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Search input */}
      {stocks.length > 0 && (
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="ค้นหาโครงการ ทำเล..."
            className="w-full pl-9 pr-9 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* Grid */}
      {filtered.length > 0 ? (
        <>
          {(filterType !== 'all' || query) && (
            <p className="text-xs text-gray-400 mb-3">{filtered.length} ประกาศ</p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(stock => (
              <ListingCard key={stock.id} stock={stock} />
            ))}
          </div>
        </>
      ) : stocks.length > 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Search className="w-10 h-10 mx-auto mb-3 opacity-20" />
          <p className="text-sm">ไม่พบประกาศที่ตรงกับเงื่อนไข</p>
          <button
            type="button"
            onClick={() => { setFilterType('all'); setQuery('') }}
            className="mt-2 text-xs text-blue-600 hover:underline"
          >
            ล้างตัวกรอง
          </button>
        </div>
      ) : (
        <div className="text-center py-20 text-gray-400">
          <Building2 className="w-12 h-12 mx-auto mb-3 opacity-25" />
          <p className="text-sm">ยังไม่มีประกาศในขณะนี้</p>
        </div>
      )}
    </div>
  )
}
