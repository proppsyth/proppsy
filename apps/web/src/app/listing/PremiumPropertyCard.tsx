import Link from 'next/link'
import StorageImage from '@/components/shared/StorageImage'
import SaveButton from '@/components/shared/SaveButton'
import CompareButton from '@/components/shared/CompareButton'
import { Building2, Maximize, Layers, MapPin, Train, BedDouble, CheckCircle2 } from 'lucide-react'
import type { Stock } from '@/types'
import { formatRoomType } from '@/types'
import { buildListingSlug } from '@/lib/listingSlug'

export type StockWithProject = Stock & {
  project?: { province?: string; district?: string; bts_mrt?: string[] } | null
}

function fmt(n: number) {
  return new Intl.NumberFormat('th-TH').format(n)
}

export default function PremiumPropertyCard({ stock }: { stock: StockWithProject }) {
  const photo = stock.photo_thumb_urls?.[0] ?? stock.photo_urls?.[0]
  const isRent = stock.listing_type !== 'sale'
  const isSale = stock.listing_type !== 'rent'
  const price = stock.listing_type === 'sale' ? stock.sale_price : stock.rent_price
  const altPrice = stock.listing_type === 'both' ? stock.sale_price : null
  const location = [stock.project?.district, stock.project?.province].filter(Boolean).join(', ')
  const stations = stock.project?.bts_mrt?.slice(0, 2) ?? []

  const slug = buildListingSlug({
    id: stock.id,
    room_type: stock.room_type,
    listing_type: stock.listing_type,
    project_name: stock.project_name,
  })

  return (
    <Link
      href={`/listing/${slug}`}
      prefetch={false}
      className="group bg-white rounded-2xl overflow-hidden border border-orange-200 ring-1 ring-orange-100 shadow-md hover:shadow-xl transition-shadow block"
    >
      {/* Image — 16:9 for premium feel */}
      <div className="relative aspect-video bg-gray-100">
        <StorageImage
          src={photo}
          alt={stock.project_name ?? 'ทรัพย์'}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-500"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 600px"
          fallback={
            <div className="absolute inset-0 flex items-center justify-center">
              <Building2 className="w-14 h-14 text-gray-200" />
            </div>
          }
        />
        {/* Gradient overlay for bottom legibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

        {/* Listing type badges */}
        <div className="absolute top-3 left-3 flex gap-1.5">
          {isRent && (
            <span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-blue-500/90 text-white backdrop-blur-sm">
              เช่า
            </span>
          )}
          {isSale && stock.listing_type !== 'rent' && (
            <span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-green-500/90 text-white backdrop-blur-sm">
              ขาย
            </span>
          )}
        </div>

        {/* HOT badge */}
        <span
          className="absolute top-3 right-3 text-[11px] px-3 py-1 rounded-full font-bold text-white animate-hot-glow shadow-lg"
          style={{ background: 'linear-gradient(135deg, #f97316 0%, #ef4444 100%)' }}
        >
          ⭐ HOT
        </span>

        {/* Price overlay on image bottom */}
        <div className="absolute bottom-3 left-3 right-14">
          {price != null && (
            <p className="text-2xl font-extrabold text-white drop-shadow-md leading-none">
              ฿{fmt(price)}
              {stock.listing_type !== 'sale' && (
                <span className="text-sm font-normal text-white/80 ml-1">/เดือน</span>
              )}
            </p>
          )}
          {altPrice != null && stock.listing_type === 'both' && (
            <p className="text-sm text-white/70 mt-0.5">ขาย ฿{fmt(altPrice)}</p>
          )}
        </div>

        {/* Action buttons */}
        <div className="absolute bottom-3 right-3 z-10 flex items-center gap-1.5">
          <CompareButton stock={stock} />
          <SaveButton stockId={stock.id} variant="card" />
        </div>
      </div>

      {/* Info */}
      <div className="p-4">
        <p className="text-base font-bold text-gray-900 leading-snug line-clamp-1">
          {stock.project_name ?? 'ไม่ระบุโครงการ'}
        </p>
        {stock.unit_no && (
          <p className="text-xs text-gray-400 mt-0.5">ยูนิต {stock.unit_no}</p>
        )}

        {location && (
          <p className="text-sm text-gray-500 flex items-center gap-1 mt-1.5">
            <MapPin className="w-3.5 h-3.5 flex-shrink-0 text-blue-400" />
            {location}
          </p>
        )}

        {/* Stats row */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mt-3 text-sm text-gray-500">
          {stock.room_type && (
            <span className="flex items-center gap-1">
              <BedDouble className="w-3.5 h-3.5 text-gray-400" />
              {formatRoomType(stock.room_type)}
            </span>
          )}
          {stock.size_sqm && (
            <span className="flex items-center gap-1">
              <Maximize className="w-3.5 h-3.5 text-gray-400" />
              {stock.size_sqm} ตร.ม.
            </span>
          )}
          {stock.floor && (
            <span className="flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-gray-400" />
              ชั้น {stock.floor}
            </span>
          )}
        </div>

        {/* Tags row */}
        <div className="flex flex-wrap gap-1.5 mt-3">
          {stations.map(s => (
            <span
              key={s}
              className="inline-flex items-center gap-1 text-[11px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-100 font-medium"
            >
              <Train className="w-3 h-3" />
              {s}
            </span>
          ))}
          {stock.co_agent_accepted && (
            <span className="inline-flex items-center gap-1 text-[11px] bg-teal-50 text-teal-700 px-2 py-0.5 rounded-full border border-teal-100 font-medium">
              <CheckCircle2 className="w-3 h-3" />
              Co-Agent
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}
