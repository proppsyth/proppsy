import Link from 'next/link'
import StorageImage from '@/components/shared/StorageImage'
import SaveButton from '@/components/shared/SaveButton'
import { Building2, Maximize, Layers, MapPin, Train } from 'lucide-react'
import type { Stock } from '@/types'
import { formatRoomType } from '@/types'

export type StockWithProject = Stock & {
  project?: { province?: string; district?: string; bts_mrt?: string[] } | null
}

function fmt(n: number) {
  return new Intl.NumberFormat('th-TH').format(n)
}

export default function PropertyCard({ stock }: { stock: StockWithProject }) {
  const photo = stock.photo_thumb_urls?.[0] ?? stock.photo_urls?.[0]
  const isRent = stock.listing_type !== 'sale'
  const isSale = stock.listing_type !== 'rent'
  const price = stock.listing_type === 'sale' ? stock.sale_price : stock.rent_price
  const location = [stock.project?.district, stock.project?.province].filter(Boolean).join(', ')
  const stations = stock.project?.bts_mrt?.slice(0, 2) ?? []

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
        <div className="absolute bottom-2 right-2 z-10">
          <SaveButton stockId={stock.id} variant="card" />
        </div>
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
          {stock.room_type && <span className="bg-gray-50 px-2 py-0.5 rounded-full border border-gray-100">{formatRoomType(stock.room_type)}</span>}
          {stock.size_sqm && <span className="flex items-center gap-0.5"><Maximize className="w-3 h-3" />{stock.size_sqm} ตร.ม.</span>}
          {stock.co_agent_accepted && <span className="bg-teal-50 text-teal-700 px-2 py-0.5 rounded-full border border-teal-100 text-[10px] font-medium">Co-Agent</span>}
          {stock.floor && <span className="flex items-center gap-0.5"><Layers className="w-3 h-3" />ชั้น {stock.floor}</span>}
          {stations.map(s => (
            <span key={s} className="flex items-center gap-0.5 text-blue-500"><Train className="w-3 h-3" />{s}</span>
          ))}
        </div>
      </div>
    </Link>
  )
}
