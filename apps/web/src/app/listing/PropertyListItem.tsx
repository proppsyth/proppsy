import Link from 'next/link'
import StorageImage from '@/components/shared/StorageImage'
import { Building2, Maximize, MapPin, Train } from 'lucide-react'
import type { StockWithProject } from './PropertyCard'
import { formatRoomType } from '@/types'

function fmt(n: number) {
  return new Intl.NumberFormat('th-TH').format(n)
}

export default function PropertyListItem({ stock }: { stock: StockWithProject }) {
  const photo = stock.photo_thumb_urls?.[0] ?? stock.photo_urls?.[0]
  const price = stock.listing_type === 'sale' ? stock.sale_price : stock.rent_price
  const location = [stock.project?.district, stock.project?.province].filter(Boolean).join(', ')
  const stations = stock.project?.bts_mrt?.slice(0, 2) ?? []

  return (
    <Link
      href={`/listing/${stock.id}`}
      className={`group bg-white rounded-xl overflow-hidden border shadow-sm hover:shadow-md transition-shadow flex ${
        stock.is_premium ? 'border-orange-200 ring-1 ring-orange-200' : 'border-gray-100'
      }`}
    >
      {/* Image */}
      <div className="relative w-28 sm:w-40 flex-shrink-0 bg-gray-100">
        <div className="absolute inset-0">
          <StorageImage
            src={photo}
            alt={stock.project_name ?? 'ทรัพย์'}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="160px"
            fallback={
              <div className="absolute inset-0 flex items-center justify-center">
                <Building2 className="w-8 h-8 text-gray-200" />
              </div>
            }
          />
        </div>
      </div>

      {/* Info */}
      <div className="flex-1 p-3 min-w-0 flex flex-col justify-between gap-1.5">
        <div>
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-semibold text-gray-900 truncate">{stock.project_name ?? 'ไม่ระบุโครงการ'}</p>
            {stock.is_premium && (
              <span className="flex-shrink-0 text-[10px] px-2 py-0.5 rounded-full font-bold text-white"
                style={{ background: 'linear-gradient(135deg, #f97316 0%, #ef4444 100%)' }}>
                HOT
              </span>
            )}
          </div>
          {location && (
            <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
              <MapPin className="w-3 h-3 flex-shrink-0" />{location}
            </p>
          )}
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {stock.listing_type !== 'sale' && <span className="text-[11px] px-2 py-0.5 rounded-full font-medium bg-blue-100 text-blue-600">เช่า</span>}
          {stock.listing_type !== 'rent' && <span className="text-[11px] px-2 py-0.5 rounded-full font-medium bg-green-100 text-green-600">ขาย</span>}
          {stock.room_type && <span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">{formatRoomType(stock.room_type)}</span>}
          {stock.size_sqm && <span className="text-[11px] text-gray-400 flex items-center gap-0.5"><Maximize className="w-3 h-3" />{stock.size_sqm}ตร.ม.</span>}
        </div>

        <div className="flex items-center justify-between gap-2">
          {price != null ? (
            <p className="text-base font-bold text-gray-900">
              ฿{fmt(price)}
              {stock.listing_type !== 'sale' && <span className="text-xs font-normal text-gray-400">/เดือน</span>}
            </p>
          ) : <span />}
          {stations.length > 0 && (
            <div className="flex items-center gap-1 flex-shrink-0">
              {stations.map(s => (
                <span key={s} className="text-[11px] text-blue-500 flex items-center gap-0.5">
                  <Train className="w-3 h-3" />{s}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </Link>
  )
}
