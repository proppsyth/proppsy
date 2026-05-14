'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Search, LayoutGrid, List, Home, Globe } from 'lucide-react'
import { ownerDisplayName, stockDisplayTitle } from '@/types'
import type { Stock, StockStatus, ListingType } from '@/types'

const STATUS_COLORS: Record<StockStatus, string> = {
  available: 'bg-green-100 text-green-700',
  rented: 'bg-blue-100 text-blue-700',
  sold: 'bg-purple-100 text-purple-700',
  unavailable: 'bg-gray-100 text-gray-600',
}

const STATUS_LABELS: Record<StockStatus, string> = {
  available: 'ว่าง',
  rented: 'เช่าแล้ว',
  sold: 'ขายแล้ว',
  unavailable: 'ไม่ว่าง',
}

const LISTING_LABELS: Record<ListingType, string> = {
  rent: 'ให้เช่า',
  sale: 'ขาย',
  both: 'ให้เช่า / ขาย',
}

function formatPrice(n: number): string {
  return new Intl.NumberFormat('th-TH').format(n)
}

interface Props {
  stocks: Stock[]
}

export default function StockList({ stocks }: Props) {
  const [search, setSearch] = useState('')
  const [view, setView] = useState<'grid' | 'list'>('grid')

  const filtered = search.trim()
    ? stocks.filter(s => {
        const q = search.toLowerCase()
        return (
          s.project_name?.toLowerCase().includes(q) ||
          s.unit_no?.toLowerCase().includes(q) ||
          s.unit_name?.toLowerCase().includes(q) ||
          s.building?.toLowerCase().includes(q) ||
          s.room_type?.toLowerCase().includes(q) ||
          s.id.toLowerCase().includes(q)
        )
      })
    : stocks

  return (
    <div>
      {/* Controls */}
      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="ค้นหาโครงการ, ยูนิต..."
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition bg-white"
          />
        </div>
        <div className="flex border border-gray-200 rounded-xl overflow-hidden bg-white">
          <button
            onClick={() => setView('grid')}
            className={`px-3 py-2.5 transition ${view === 'grid' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}
            aria-label="Grid view"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setView('list')}
            className={`px-3 py-2.5 transition ${view === 'list' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}
            aria-label="List view"
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <Home className="w-6 h-6 text-gray-400" />
          </div>
          <p className="text-gray-500 font-medium mb-1">
            {search ? 'ไม่พบทรัพย์ที่ค้นหา' : 'ยังไม่มีทรัพย์'}
          </p>
          <p className="text-gray-400 text-sm">
            {search ? 'ลองค้นหาด้วยคำอื่น' : 'กดปุ่ม "เพิ่มทรัพย์" เพื่อเริ่มต้น'}
          </p>
        </div>
      )}

      {/* Grid view */}
      {filtered.length > 0 && view === 'grid' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(s => <StockGridCard key={s.id} stock={s} />)}
        </div>
      )}

      {/* List view */}
      {filtered.length > 0 && view === 'list' && (
        <div className="space-y-2">
          {filtered.map(s => <StockListRow key={s.id} stock={s} />)}
        </div>
      )}
    </div>
  )
}

// ─── Grid Card ──────────────────────────────────────────────

function StockGridCard({ stock: s }: { stock: Stock }) {
  const photo = s.photo_urls?.[0]
  const price = s.listing_type === 'sale' ? s.sale_price : s.rent_price
  const priceLabel = s.listing_type === 'sale' ? 'ขาย' : 'เช่า'
  const owner = s.owner as (Stock['owner'] & { nickname?: string | null; first_name_th?: string | null; last_name_th?: string | null }) | undefined

  return (
    <Link href={`/stock/${s.id}`} className="group bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md hover:border-blue-200 transition-all block">
      {/* Photo */}
      <div className="relative aspect-[4/3] bg-gray-100">
        {photo ? (
          <Image src={photo} alt={s.unit_no ?? s.id} fill className="object-cover group-hover:scale-105 transition-transform duration-300" sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Home className="w-10 h-10 text-gray-300" />
          </div>
        )}
        <span className={`absolute top-2 right-2 text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[s.status]}`}>
          {STATUS_LABELS[s.status]}
        </span>
        {s.is_premium && (
          <span className="absolute top-2 left-2 text-[10px] px-2 py-0.5 rounded-full font-bold text-white animate-hot-glow"
            style={{ background: 'linear-gradient(135deg, #f97316 0%, #ef4444 100%)' }}>
            HOT
          </span>
        )}
        {s.is_published && !s.is_premium && (
          <span className="absolute top-2 left-2 flex items-center gap-0.5 text-[10px] px-2 py-0.5 rounded-full font-medium bg-green-600/90 text-white">
            <Globe className="w-2.5 h-2.5" />
            เผยแพร่
          </span>
        )}
      </div>

      {/* Content */}
      <div className="p-3">
        <p className="text-xs text-gray-400 mb-0.5">{s.id}</p>
        <p className="font-medium text-gray-900 text-sm leading-tight truncate">
          {stockDisplayTitle(s)}
        </p>

        {price ? (
          <p className="text-blue-600 font-semibold text-sm mt-1">
            ฿{formatPrice(price)}
            {s.listing_type !== 'sale' && <span className="text-gray-400 font-normal">/เดือน</span>}
            {s.listing_type === 'both' && s.rent_price && s.sale_price && (
              <span className="text-gray-400 font-normal text-xs ml-1">| ขาย ฿{formatPrice(s.sale_price)}</span>
            )}
          </p>
        ) : (
          <p className="text-gray-400 text-sm mt-1">ไม่ระบุราคา</p>
        )}

        <div className="flex items-center gap-2 mt-1.5 text-xs text-gray-500">
          {s.size_sqm && <span>{s.size_sqm} ตร.ม.</span>}
          {s.size_sqm && s.floor && <span>·</span>}
          {s.floor && <span>ชั้น {s.floor}</span>}
          {(s.size_sqm || s.floor) && s.listing_type && <span>·</span>}
          <span>{LISTING_LABELS[s.listing_type]}</span>
        </div>

        {owner && (
          <p className="text-xs text-gray-400 mt-1.5 truncate">
            เจ้าของ: {ownerDisplayName(owner)}
          </p>
        )}
      </div>
    </Link>
  )
}

// ─── List Row ────────────────────────────────────────────────

function StockListRow({ stock: s }: { stock: Stock }) {
  const photo = s.photo_urls?.[0]
  const price = s.listing_type === 'sale' ? s.sale_price : s.rent_price
  const owner = s.owner as Stock['owner']

  return (
    <Link href={`/stock/${s.id}`} className="group bg-white rounded-xl border border-gray-100 shadow-sm flex overflow-hidden hover:shadow-md hover:border-blue-200 transition-all">
      {/* Photo */}
      <div className="relative w-24 sm:w-32 flex-shrink-0 bg-gray-100">
        {photo ? (
          <Image src={photo} alt={s.unit_no ?? s.id} fill className="object-cover" sizes="128px" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Home className="w-6 h-6 text-gray-300" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 p-3 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs text-gray-400">{s.id}</p>
            <p className="font-medium text-gray-900 text-sm truncate">{stockDisplayTitle(s)}</p>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {s.is_premium && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold text-white animate-hot-glow"
                style={{ background: 'linear-gradient(135deg, #f97316 0%, #ef4444 100%)' }}>
                HOT
              </span>
            )}
            {s.is_published && !s.is_premium && (
              <span className="flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-green-100 text-green-700">
                <Globe className="w-2.5 h-2.5" />
                เผยแพร่
              </span>
            )}
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[s.status]}`}>
              {STATUS_LABELS[s.status]}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 mt-1 flex-wrap">
          {price ? (
            <span className="text-blue-600 font-semibold text-sm">
              ฿{formatPrice(price)}{s.listing_type !== 'sale' ? '/เดือน' : ''}
            </span>
          ) : null}
          {s.size_sqm && <span className="text-xs text-gray-500">{s.size_sqm} ตร.ม.</span>}
          {s.floor && <span className="text-xs text-gray-500">ชั้น {s.floor}</span>}
          <span className="text-xs text-gray-500">{LISTING_LABELS[s.listing_type]}</span>
        </div>

        {owner && (
          <p className="text-xs text-gray-400 mt-1 truncate">เจ้าของ: {ownerDisplayName(owner)}</p>
        )}
      </div>
    </Link>
  )
}
