'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { SlidersHorizontal, X, Grid3X3, List, Table2, ChevronLeft, ChevronRight, Building2, Search } from 'lucide-react'
import PropertyCard, { type StockWithProject } from './PropertyCard'
import PropertyListItem from './PropertyListItem'
import PropertyTableView from './PropertyTableView'
import CompareBar from '@/components/shared/CompareBar'

type ViewMode = 'grid' | 'list' | 'table'

const RENT_PRICE_BUCKETS = [
  { value: 'all', label: 'ทุกราคา' },
  { value: 'low', label: '≤15K' },
  { value: 'mid', label: '15K–30K' },
  { value: 'high', label: '30K–60K' },
  { value: 'premium', label: '60K+' },
]
const SALE_PRICE_BUCKETS = [
  { value: 'all', label: 'ทุกราคา' },
  { value: 'low', label: '≤2M' },
  { value: 'mid', label: '2M–5M' },
  { value: 'high', label: '5M–10M' },
  { value: 'premium', label: '10M+' },
]

export interface FilterState {
  q?: string
  listing_type?: string
  room_type?: string
  province?: string
  bts_mrt?: string
  price_bucket?: string
  status?: string
  sort?: string
  page?: string
  co_agent?: string
}

export interface FilterOptions {
  provinces: string[]
  roomTypes: string[]
  btsMrtOptions: string[]
}

function buildUrl(filters: FilterState): string {
  const params = new URLSearchParams()
  if (filters.q?.trim()) params.set('q', filters.q.trim())
  if (filters.listing_type && filters.listing_type !== 'all') params.set('listing_type', filters.listing_type)
  if (filters.room_type && filters.room_type !== 'all') params.set('room_type', filters.room_type)
  if (filters.province && filters.province !== 'all') params.set('province', filters.province)
  if (filters.bts_mrt && filters.bts_mrt !== 'all') params.set('bts_mrt', filters.bts_mrt)
  if (filters.price_bucket && filters.price_bucket !== 'all') params.set('price_bucket', filters.price_bucket)
  if (filters.status && filters.status !== 'available') params.set('status', filters.status)
  if (filters.sort && filters.sort !== 'newest') params.set('sort', filters.sort)
  if (filters.page && filters.page !== '1') params.set('page', filters.page)
  if (filters.co_agent && filters.co_agent === 'yes') params.set('co_agent', 'yes')
  return `/listing${params.size > 0 ? '?' + params.toString() : ''}`
}

function buildPageNumbers(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const pages: (number | '...')[] = [1]
  if (current > 3) pages.push('...')
  for (let p = Math.max(2, current - 1); p <= Math.min(total - 1, current + 1); p++) pages.push(p)
  if (current < total - 2) pages.push('...')
  pages.push(total)
  return pages
}

// ── FilterPanel (module-level, not nested) ─────────────────────

interface FilterPanelProps {
  currentFilters: FilterState
  filterOptions: FilterOptions
  onFilter: (overrides: Partial<FilterState>) => void
  onClear: () => void
}

function FilterPanel({ currentFilters, filterOptions, onFilter, onClear }: FilterPanelProps) {
  const [localQ, setLocalQ] = useState(currentFilters.q ?? '')
  const priceBuckets = currentFilters.listing_type === 'sale' ? SALE_PRICE_BUCKETS : RENT_PRICE_BUCKETS

  const activeCount = [
    currentFilters.q,
    currentFilters.listing_type && currentFilters.listing_type !== 'all' ? 1 : null,
    currentFilters.room_type && currentFilters.room_type !== 'all' ? 1 : null,
    currentFilters.province && currentFilters.province !== 'all' ? 1 : null,
    currentFilters.bts_mrt && currentFilters.bts_mrt !== 'all' ? 1 : null,
    currentFilters.price_bucket && currentFilters.price_bucket !== 'all' ? 1 : null,
    currentFilters.status && currentFilters.status !== 'available' ? 1 : null,
    currentFilters.co_agent === 'yes' ? 1 : null,
  ].filter(Boolean).length

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    onFilter({ q: localQ })
  }

  return (
    <div className="space-y-5">
      {/* Keyword search */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">ค้นหา</p>
        <form onSubmit={handleSearch} className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={localQ}
            onChange={e => setLocalQ(e.target.value)}
            placeholder="ชื่อโครงการ ย่าน..."
            className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </form>
      </div>

      {/* Listing type */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">ประเภท</p>
        <div className="flex gap-1.5 flex-wrap">
          {(['all', 'rent', 'sale'] as const).map(t => (
            <button key={t} onClick={() => onFilter({ listing_type: t, price_bucket: 'all' })}
              className={`px-3 py-1.5 text-xs rounded-full font-medium transition ${
                (currentFilters.listing_type ?? 'all') === t
                  ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}>
              {t === 'all' ? 'ทั้งหมด' : t === 'rent' ? 'เช่า' : 'ขาย'}
            </button>
          ))}
        </div>
      </div>

      {/* Room type */}
      {filterOptions.roomTypes.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">ประเภทห้อง</p>
          <div className="flex gap-1.5 flex-wrap">
            <button onClick={() => onFilter({ room_type: 'all' })}
              className={`px-3 py-1.5 text-xs rounded-full font-medium transition ${
                !currentFilters.room_type || currentFilters.room_type === 'all'
                  ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}>
              ทั้งหมด
            </button>
            {filterOptions.roomTypes.map(rt => (
              <button key={rt} onClick={() => onFilter({ room_type: rt })}
                className={`px-3 py-1.5 text-xs rounded-full font-medium transition ${
                  currentFilters.room_type === rt
                    ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}>
                {rt}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Province */}
      {filterOptions.provinces.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">จังหวัด</p>
          <select
            value={currentFilters.province ?? 'all'}
            onChange={e => onFilter({ province: e.target.value })}
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="all">ทุกจังหวัด</option>
            {filterOptions.provinces.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
      )}

      {/* BTS/MRT */}
      {filterOptions.btsMrtOptions.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">BTS / MRT</p>
          <select
            value={currentFilters.bts_mrt ?? 'all'}
            onChange={e => onFilter({ bts_mrt: e.target.value })}
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="all">ทุกสาย</option>
            {filterOptions.btsMrtOptions.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      )}

      {/* Price range */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
          ราคา{currentFilters.listing_type === 'sale' ? ' (ขาย)' : ' (เช่า/เดือน)'}
        </p>
        <div className="flex gap-1.5 flex-wrap">
            {priceBuckets.map(b => (
              <button key={b.value} onClick={() => onFilter({ price_bucket: b.value })}
                className={`px-3 py-1.5 text-xs rounded-full font-medium transition ${
                  (currentFilters.price_bucket ?? 'all') === b.value
                    ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}>
                {b.label}
              </button>
            ))}
        </div>
      </div>

      {/* Status */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">สถานะ</p>
        <div className="flex gap-1.5 flex-wrap">
          {([
            { value: 'available', label: 'ว่าง' },
            { value: 'all', label: 'ทั้งหมด' },
          ] as const).map(s => (
            <button key={s.value} onClick={() => onFilter({ status: s.value })}
              className={`px-3 py-1.5 text-xs rounded-full font-medium transition ${
                (currentFilters.status ?? 'available') === s.value
                  ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Co-agent */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Co-Agent</p>
        <label className="flex items-center gap-2 cursor-pointer w-fit">
          <input
            type="checkbox"
            checked={currentFilters.co_agent === 'yes'}
            onChange={e => onFilter({ co_agent: e.target.checked ? 'yes' : 'all', page: '1' })}
            className="w-4 h-4 rounded accent-blue-600"
          />
          <span className="text-xs text-gray-600">เฉพาะทรัพย์ที่รับ Co-Agent</span>
        </label>
      </div>

      {/* Clear all */}
      {activeCount > 0 && (
        <button
          onClick={onClear}
          className="w-full py-2 text-sm text-red-500 hover:text-red-600 transition border border-red-100 rounded-xl hover:bg-red-50"
        >
          ล้างตัวกรองทั้งหมด
        </button>
      )}
    </div>
  )
}

// ── Main client component ──────────────────────────────────────

interface Props {
  stocks: StockWithProject[]
  totalCount: number
  currentPage: number
  pageSize: number
  filterOptions: FilterOptions
  currentFilters: FilterState
}

export default function ListingPageClient({
  stocks, totalCount, currentPage, pageSize, filterOptions, currentFilters,
}: Props) {
  const router = useRouter()
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [drawerOpen, setDrawerOpen] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('listing-view-mode')
    if (saved === 'grid' || saved === 'list' || saved === 'table') setViewMode(saved)
  }, [])

  function changeViewMode(mode: ViewMode) {
    setViewMode(mode)
    localStorage.setItem('listing-view-mode', mode)
  }

  function handleFilter(overrides: Partial<FilterState>) {
    // Keep the mobile drawer open so multiple filters can be picked in a row;
    // results update live behind it and the user closes it via "ดูผลลัพธ์"/X.
    router.push(buildUrl({ ...currentFilters, ...overrides, page: '1' }))
  }

  function handleClear() {
    router.push('/listing')
    setDrawerOpen(false)
  }

  const totalPages = Math.ceil(totalCount / pageSize)

  const activeFilterCount = [
    currentFilters.q,
    currentFilters.listing_type && currentFilters.listing_type !== 'all' ? 1 : null,
    currentFilters.room_type && currentFilters.room_type !== 'all' ? 1 : null,
    currentFilters.province && currentFilters.province !== 'all' ? 1 : null,
    currentFilters.bts_mrt && currentFilters.bts_mrt !== 'all' ? 1 : null,
    currentFilters.price_bucket && currentFilters.price_bucket !== 'all' ? 1 : null,
    currentFilters.status && currentFilters.status !== 'available' ? 1 : null,
    currentFilters.co_agent === 'yes' ? 1 : null,
  ].filter(Boolean).length

  return (
    <div className="flex min-h-screen">
      {/* ── Desktop sidebar ── */}
      <aside className="hidden lg:block w-80 flex-shrink-0 border-r border-gray-100 bg-white">
        <div className="sticky top-14 p-5 overflow-y-auto max-h-[calc(100vh-56px)]">
          <FilterPanel
            currentFilters={currentFilters}
            filterOptions={filterOptions}
            onFilter={handleFilter}
            onClear={handleClear}
          />
        </div>
      </aside>

      {/* ── Main content ── */}
      <div className="flex-1 min-w-0">
        {/* Sub-header: count + sort + view toggle */}
        <div className={`bg-white border-b border-gray-100 sticky top-14 ${drawerOpen ? 'z-0' : 'z-10'}`}>
          <div className="px-4 py-2.5 flex items-center gap-2.5">
            {/* Mobile filter button */}
            <button
              onClick={() => setDrawerOpen(true)}
              className="lg:hidden flex items-center gap-1.5 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-sm font-medium text-gray-700 transition flex-shrink-0"
            >
              <SlidersHorizontal className="w-4 h-4" />
              กรอง
              {activeFilterCount > 0 && (
                <span className="bg-blue-600 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center leading-none">
                  {activeFilterCount}
                </span>
              )}
            </button>

            {/* Result count */}
            <p className="flex-1 text-sm text-gray-500 truncate min-w-0">
              พบ <span className="font-semibold text-gray-900">{totalCount.toLocaleString('th-TH')}</span> รายการ
              {currentFilters.q && ` · "${currentFilters.q}"`}
            </p>

            {/* Sort */}
            <select
              value={currentFilters.sort ?? 'newest'}
              onChange={e => router.push(buildUrl({ ...currentFilters, sort: e.target.value, page: '1' }))}
              className="text-xs border border-gray-200 rounded-xl px-2 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white flex-shrink-0"
            >
              <option value="newest">ใหม่ล่าสุด</option>
              <option value="price_asc">ราคาต่ำ→สูง</option>
              <option value="price_desc">ราคาสูง→ต่ำ</option>
            </select>

            {/* View mode toggle */}
            <div className="flex border border-gray-200 rounded-xl overflow-hidden flex-shrink-0">
              {([
                { mode: 'grid' as ViewMode, Icon: Grid3X3 },
                { mode: 'list' as ViewMode, Icon: List },
                { mode: 'table' as ViewMode, Icon: Table2 },
              ]).map(({ mode, Icon }) => (
                <button key={mode} onClick={() => changeViewMode(mode)}
                  className={`p-2 transition ${viewMode === mode ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-50'}`}>
                  <Icon className="w-4 h-4" />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Property display */}
        <div className="p-4">
          {stocks.length === 0 ? (
            <div className="text-center py-24 text-gray-400">
              <Building2 className="w-14 h-14 mx-auto mb-3 opacity-25" />
              <p className="text-sm font-medium text-gray-600 mb-1">ไม่พบทรัพย์สินที่ตรงกับเงื่อนไข</p>
              <p className="text-xs text-gray-400 mb-5">ลองปรับตัวกรองหรือค้นหาใหม่</p>
              <button onClick={handleClear} className="text-sm text-blue-600 hover:underline">
                ล้างตัวกรองทั้งหมด
              </button>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
              {stocks.map(stock => <PropertyCard key={stock.id} stock={stock} />)}
            </div>
          ) : viewMode === 'list' ? (
            <div className="flex flex-col gap-3">
              {stocks.map(stock => <PropertyListItem key={stock.id} stock={stock} />)}
            </div>
          ) : (
            <PropertyTableView stocks={stocks} />
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-1.5 flex-wrap">
              {currentPage > 1 && (
                <Link href={buildUrl({ ...currentFilters, page: String(currentPage - 1) })}
                  className="flex items-center gap-1 px-3 py-2 text-sm border border-gray-200 rounded-xl hover:bg-gray-50 transition text-gray-600">
                  <ChevronLeft className="w-4 h-4" />
                  ก่อนหน้า
                </Link>
              )}
              {buildPageNumbers(currentPage, totalPages).map((p, i) =>
                p === '...' ? (
                  <span key={`e${i}`} className="px-2 py-2 text-sm text-gray-400">...</span>
                ) : (
                  <Link key={p} href={buildUrl({ ...currentFilters, page: String(p) })}
                    className={`w-9 h-9 flex items-center justify-center text-sm rounded-xl transition ${
                      Number(p) === currentPage
                        ? 'bg-blue-600 text-white font-medium'
                        : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}>
                    {p}
                  </Link>
                )
              )}
              {currentPage < totalPages && (
                <Link href={buildUrl({ ...currentFilters, page: String(currentPage + 1) })}
                  className="flex items-center gap-1 px-3 py-2 text-sm border border-gray-200 rounded-xl hover:bg-gray-50 transition text-gray-600">
                  ถัดไป
                  <ChevronRight className="w-4 h-4" />
                </Link>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Mobile filter drawer ── */}
      {drawerOpen && (
        <>
          <div
            className="lg:hidden fixed inset-0 bg-black/50 z-40"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="lg:hidden fixed inset-y-0 left-0 w-80 max-w-[85vw] bg-white z-50 flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 flex-shrink-0">
              <h2 className="text-base font-semibold text-gray-900">ตัวกรอง</h2>
              <button onClick={() => setDrawerOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-100 transition">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <FilterPanel
                currentFilters={currentFilters}
                filterOptions={filterOptions}
                onFilter={handleFilter}
                onClear={handleClear}
              />
            </div>
            <div className="flex-shrink-0 border-t border-gray-100 p-3">
              <button
                onClick={() => setDrawerOpen(false)}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition"
              >
                ดูผลลัพธ์ ({totalCount.toLocaleString('th-TH')} รายการ)
              </button>
            </div>
          </div>
        </>
      )}
      <CompareBar />
    </div>
  )
}
