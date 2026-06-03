import Link from 'next/link'
import { FileText, ExternalLink, Home, CalendarDays, BanknoteIcon } from 'lucide-react'

// Statuses treated as active/ongoing
const ACTIVE_STATUSES = new Set([
  'draft', 'sent', 'sent_for_sign', 'viewed',
  'partially_signed', 'signed', 'finalized', 'active',
])

const STATUS_COLORS: Record<string, string> = {
  draft:              'bg-gray-100 text-gray-500',
  sent:               'bg-yellow-100 text-yellow-700',
  sent_for_sign:      'bg-yellow-100 text-yellow-700',
  viewed:             'bg-blue-100 text-blue-700',
  partially_signed:   'bg-orange-100 text-orange-700',
  signed:             'bg-green-100 text-green-700',
  finalized:          'bg-emerald-100 text-emerald-700',
  active:             'bg-emerald-100 text-emerald-700',
  completed:          'bg-teal-100 text-teal-600',
  cancelled:          'bg-red-100 text-red-600',
  terminated:         'bg-rose-100 text-rose-700',
  renewed:            'bg-purple-100 text-purple-700',
  converted_to_lease: 'bg-sky-100 text-sky-700',
}

const STATUS_TH: Record<string, string> = {
  draft:              'ร่าง',
  sent:               'ส่งแล้ว',
  sent_for_sign:      'รอลงนาม',
  viewed:             'เปิดดูแล้ว',
  partially_signed:   'ลงนามบางส่วน',
  signed:             'ลงนามครบ',
  finalized:          'ล็อกแล้ว',
  active:             'ใช้งาน',
  completed:          'เสร็จสมบูรณ์',
  cancelled:          'ยกเลิก',
  terminated:         'บอกเลิก',
  renewed:            'ต่อสัญญา',
  converted_to_lease: 'สร้างสัญญาเช่าแล้ว',
}

const DOC_TYPE_TH: Record<string, string> = {
  rental:      'สัญญาเช่า',
  reservation: 'ใบจอง',
  renewal:     'ต่อสัญญา',
}

const CATEGORY_COLORS: Record<string, string> = {
  lease:       'bg-blue-50 text-blue-700',
  reservation: 'bg-amber-50 text-amber-700',
  child:       'bg-gray-50 text-gray-500',
}

function fmt(n: number | null | undefined) {
  if (n == null) return '—'
  return new Intl.NumberFormat('th-TH').format(n)
}

function fmtDate(d: string | null | undefined) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })
}

export interface ContractRow {
  id: string
  doc_type: string
  status: string
  created_at: string
  move_in_date: string | null
  end_date: string | null
  rent_price: number | null
  contract_category: string | null
  is_finalized: boolean | null
  stock: {
    id: string
    project_name: string | null
    unit_no: string | null
    floor: number | null
    building: string | null
    room_type: string | null
  } | null
}

function ContractCard({ c, variant }: { c: ContractRow; variant: 'active' | 'past' }) {
  const category = c.contract_category ?? 'child'
  const stock = c.stock

  const propertyLine = stock
    ? [stock.project_name, stock.unit_no].filter(Boolean).join(' · ')
    : '—'
  const subLine = stock
    ? [stock.building && `อาคาร ${stock.building}`, stock.floor && `ชั้น ${stock.floor}`, stock.room_type].filter(Boolean).join(' · ')
    : null

  return (
    <div className={`rounded-xl border p-3.5 transition-all hover:shadow-sm ${
      variant === 'active'
        ? 'border-blue-100 bg-blue-50/30'
        : 'border-gray-100 bg-white'
    }`}>
      <div className="flex items-start justify-between gap-3 mb-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
            variant === 'active' ? 'bg-blue-100' : 'bg-gray-100'
          }`}>
            <FileText className={`w-3.5 h-3.5 ${variant === 'active' ? 'text-blue-600' : 'text-gray-500'}`} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900">{c.id}</p>
            <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${STATUS_COLORS[c.status] ?? 'bg-gray-100 text-gray-500'}`}>
                {STATUS_TH[c.status] ?? c.status}
              </span>
              {category !== 'child' && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${CATEGORY_COLORS[category] ?? 'bg-gray-50 text-gray-500'}`}>
                  {DOC_TYPE_TH[c.doc_type] ?? c.doc_type}
                </span>
              )}
              {c.is_finalized && (
                <span className="text-xs px-1.5 py-0.5 rounded-full font-medium bg-emerald-50 text-emerald-700">ล็อก</span>
              )}
            </div>
          </div>
        </div>
        <Link
          href={`/contracts/${c.id}`}
          className={`flex items-center gap-1 text-xs font-medium flex-shrink-0 hover:underline ${
            variant === 'active' ? 'text-blue-600' : 'text-gray-500'
          }`}
        >
          เปิดสัญญา
          <ExternalLink className="w-3 h-3" />
        </Link>
      </div>

      {/* Property */}
      {stock && (
        <div className="flex items-start gap-1.5 mb-2">
          <Home className="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-sm text-gray-800 font-medium truncate">{propertyLine}</p>
            {subLine && <p className="text-xs text-gray-400 mt-0.5">{subLine}</p>}
          </div>
          {stock.id && (
            <Link
              href={`/stock/${stock.id}`}
              className="flex items-center gap-0.5 text-xs text-gray-400 hover:text-blue-600 transition flex-shrink-0 ml-auto"
            >
              <ExternalLink className="w-3 h-3" />
            </Link>
          )}
        </div>
      )}

      {/* Dates + rent */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
        <div className="flex items-center gap-1.5 text-gray-500">
          <CalendarDays className="w-3 h-3 text-gray-400 flex-shrink-0" />
          <span className="text-gray-400">เริ่ม</span>
          <span className="text-gray-700 font-medium">{fmtDate(c.move_in_date ?? c.created_at)}</span>
        </div>
        {c.end_date && (
          <div className="flex items-center gap-1.5 text-gray-500">
            <CalendarDays className="w-3 h-3 text-gray-400 flex-shrink-0" />
            <span className="text-gray-400">สิ้นสุด</span>
            <span className="text-gray-700 font-medium">{fmtDate(c.end_date)}</span>
          </div>
        )}
        {c.rent_price != null && (
          <div className="flex items-center gap-1.5 col-span-2">
            <BanknoteIcon className="w-3 h-3 text-gray-400 flex-shrink-0" />
            <span className="text-gray-400">ค่าเช่า</span>
            <span className="text-blue-600 font-semibold">฿{fmt(c.rent_price)}<span className="text-gray-400 font-normal">/เดือน</span></span>
          </div>
        )}
      </div>
    </div>
  )
}

interface Props {
  contracts: ContractRow[]
}

export default function CustomerContractHistory({ contracts }: Props) {
  // Only show lease + reservation contracts (the main agreements, not child docs)
  const mainContracts = contracts.filter(c =>
    c.contract_category === 'lease' || c.contract_category === 'reservation'
  )

  if (mainContracts.length === 0) return null

  const active = mainContracts.filter(c => ACTIVE_STATUSES.has(c.status))
  const past   = mainContracts.filter(c => !ACTIVE_STATUSES.has(c.status))

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50/70 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
          <FileText className="w-4 h-4 text-blue-500" />
          ประวัติสัญญา
        </h2>
        <span className="text-xs text-gray-400">{mainContracts.length} สัญญา</span>
      </div>

      <div className="p-4 space-y-5">
        {/* Active */}
        {active.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0"></span>
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                สัญญาที่ใช้งานอยู่ ({active.length})
              </p>
            </div>
            <div className="space-y-2.5">
              {active.map(c => <ContractCard key={c.id} c={c} variant="active" />)}
            </div>
          </div>
        )}

        {/* Past */}
        {past.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2.5">
              <span className="w-2 h-2 rounded-full bg-gray-300 flex-shrink-0"></span>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                ประวัติที่ผ่านมา ({past.length})
              </p>
            </div>
            {past.length <= 3 ? (
              <div className="space-y-2.5">
                {past.map(c => <ContractCard key={c.id} c={c} variant="past" />)}
              </div>
            ) : (
              <details className="group">
                <summary className="cursor-pointer select-none list-none">
                  <div className="space-y-2.5">
                    {past.slice(0, 2).map(c => <ContractCard key={c.id} c={c} variant="past" />)}
                  </div>
                  <button className="mt-2.5 w-full py-2 text-xs text-gray-400 hover:text-gray-600 border border-dashed border-gray-200 rounded-lg transition hover:border-gray-300 group-open:hidden">
                    + แสดงอีก {past.length - 2} สัญญา
                  </button>
                </summary>
                <div className="space-y-2.5 mt-2.5">
                  {past.slice(2).map(c => <ContractCard key={c.id} c={c} variant="past" />)}
                </div>
              </details>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
