import Link from 'next/link'
import type { StockWithProject } from './PropertyCard'
import { formatRoomType } from '@/types'

function fmt(n: number) {
  return new Intl.NumberFormat('th-TH').format(n)
}

export default function PropertyTableView({ stocks }: { stocks: StockWithProject[] }) {
  if (stocks.length === 0) return null

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-100 shadow-sm bg-white">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-100">
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 whitespace-nowrap">โครงการ</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 whitespace-nowrap">ประเภท</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 whitespace-nowrap">ห้อง</th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 whitespace-nowrap">ขนาด</th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 whitespace-nowrap">ชั้น</th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 whitespace-nowrap">ราคา</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 whitespace-nowrap">จังหวัด</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 whitespace-nowrap">BTS/MRT</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {stocks.map(stock => {
            const price = stock.listing_type === 'sale' ? stock.sale_price : stock.rent_price
            const stations = stock.project?.bts_mrt?.slice(0, 2) ?? []
            return (
              <tr key={stock.id} className="hover:bg-blue-50/30 transition-colors group">
                <td className="px-4 py-3">
                  <Link href={`/listing/${stock.id}`} className="flex items-center gap-2 min-w-0">
                    {stock.is_premium && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded font-bold text-white flex-shrink-0"
                        style={{ background: 'linear-gradient(135deg, #f97316 0%, #ef4444 100%)' }}>
                        HOT
                      </span>
                    )}
                    <span className="font-medium text-gray-900 group-hover:text-blue-600 transition truncate max-w-[180px]">
                      {stock.project_name ?? 'ไม่ระบุ'}
                    </span>
                  </Link>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex gap-1">
                    {stock.listing_type !== 'sale' && <span className="text-[11px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-600 font-medium">เช่า</span>}
                    {stock.listing_type !== 'rent' && <span className="text-[11px] px-1.5 py-0.5 rounded bg-green-100 text-green-600 font-medium">ขาย</span>}
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{stock.room_type ? formatRoomType(stock.room_type) : '—'}</td>
                <td className="px-4 py-3 text-right text-gray-600 whitespace-nowrap">
                  {stock.size_sqm ? `${stock.size_sqm} ตร.ม.` : '—'}
                </td>
                <td className="px-4 py-3 text-right text-gray-600">{stock.floor ?? '—'}</td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  {price != null ? (
                    <span className="font-semibold text-gray-900">
                      ฿{fmt(price)}
                      {stock.listing_type !== 'sale' && <span className="text-xs font-normal text-gray-400">/ด.</span>}
                    </span>
                  ) : <span className="text-gray-300">—</span>}
                </td>
                <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{stock.project?.province ?? '—'}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-1 flex-wrap">
                    {stations.length > 0
                      ? stations.map(s => (
                        <span key={s} className="text-xs text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded whitespace-nowrap">{s}</span>
                      ))
                      : <span className="text-gray-300">—</span>
                    }
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
