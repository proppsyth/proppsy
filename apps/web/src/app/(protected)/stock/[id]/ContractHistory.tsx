import Link from 'next/link'
import { FileText, ExternalLink, User } from 'lucide-react'

// Active statuses — these appear in "Current Contract" section
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
  converted_to_lease: 'แปลงเป็นสัญญาเช่า',
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('th-TH', {
    year: 'numeric', month: 'short', day: 'numeric',
  })
}

function fmt(n: number | null | undefined): string {
  if (n == null) return '—'
  return new Intl.NumberFormat('th-TH').format(n)
}

interface ContractRow {
  id: string
  doc_type: string
  status: string
  created_at: string
  move_in_date?: string | null
  end_date?: string | null
  rent_price?: number | null
  contract_category?: string | null
  customer?: {
    first_name_th?: string | null
    last_name_th?: string | null
    nickname?: string | null
  } | null
}

interface Props {
  contracts: ContractRow[]
}

function ContractCard({ c, highlight = false }: { c: ContractRow; highlight?: boolean }) {
  const customer = c.customer
  const tenantName = customer
    ? (customer.nickname || [customer.first_name_th, customer.last_name_th].filter(Boolean).join(' ') || '—')
    : '—'

  return (
    <Link
      href={`/contracts/${c.id}`}
      className={`block rounded-xl border p-3 transition-all hover:shadow-md ${
        highlight
          ? 'border-blue-200 bg-blue-50/40 hover:border-blue-300'
          : 'border-gray-100 bg-white hover:border-gray-200'
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <FileText className="w-4 h-4 text-blue-500 flex-shrink-0" />
          <span className="text-sm font-semibold text-gray-900 truncate">{c.id}</span>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[c.status] ?? 'bg-gray-100 text-gray-500'}`}>
            {STATUS_TH[c.status] ?? c.status}
          </span>
          <ExternalLink className="w-3.5 h-3.5 text-gray-300" />
        </div>
      </div>

      <div className="flex items-center gap-1.5 mb-2">
        <User className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
        <span className="text-sm text-gray-700 truncate">{tenantName}</span>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-500">
        <div>
          <span className="text-gray-400">เริ่ม</span>{' '}
          <span className="text-gray-700">{fmtDate(c.move_in_date)}</span>
        </div>
        <div>
          <span className="text-gray-400">สิ้นสุด</span>{' '}
          <span className="text-gray-700">{fmtDate(c.end_date)}</span>
        </div>
        {c.rent_price != null && (
          <div className="col-span-2">
            <span className="text-gray-400">ค่าเช่า</span>{' '}
            <span className="font-medium text-blue-600">฿{fmt(c.rent_price)}/เดือน</span>
          </div>
        )}
      </div>
    </Link>
  )
}

export default function ContractHistory({ contracts }: Props) {
  if (contracts.length === 0) return null

  // Only show lease contracts (doc_type === 'rental') in this panel
  const leases = contracts.filter(c => c.doc_type === 'rental' && c.contract_category === 'lease')

  if (leases.length === 0) return null

  const current  = leases.filter(c => ACTIVE_STATUSES.has(c.status))
  const history  = leases.filter(c => !ACTIVE_STATUSES.has(c.status))

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50/70 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
          <FileText className="w-4 h-4 text-blue-500" />
          ประวัติสัญญาเช่า
        </h2>
        <span className="text-xs text-gray-400">{leases.length} สัญญา</span>
      </div>

      <div className="p-4 space-y-4">
        {current.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">สัญญาปัจจุบัน</p>
            <div className="space-y-2">
              {current.map(c => <ContractCard key={c.id} c={c} highlight />)}
            </div>
          </div>
        )}

        {history.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">ประวัติที่ผ่านมา</p>
            <div className="space-y-2">
              {history.map(c => <ContractCard key={c.id} c={c} />)}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
