'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { CheckCircle, Circle, RotateCcw, Loader2 } from 'lucide-react'
import { markCommissionReceived, unmarkCommissionReceived } from './actions'

// ─── Types ───────────────────────────────────────────────────

export type CommissionRow = {
  id: string
  reservation_id: string | null
  lease_id: string | null
  amount: number
  commission_type: 'new_lease' | 'renewal'
  status: 'pipeline' | 'earned' | 'received'
  earned_at: string | null
  received_at: string | null
  created_at: string
  // enriched
  stock_unit?: string | null
  project_name?: string | null
  tenant_name?: string | null
  lease_status?: string | null
  reservation_status?: string | null
}

type Filter = 'all' | 'pipeline' | 'earned' | 'received'

function fmt(n: number) {
  return new Intl.NumberFormat('th-TH').format(Math.round(n))
}

function dateStr(iso: string | null) {
  if (!iso) return null
  return new Date(iso).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })
}

// ─── Row action button ───────────────────────────────────────

function MarkButton({ record }: { record: CommissionRow }) {
  const [isPending, startTransition] = useTransition()
  const [localStatus, setLocalStatus] = useState(record.status)

  if (localStatus === 'pipeline') return null

  if (localStatus === 'received') {
    return (
      <button
        onClick={() => startTransition(async () => {
          const res = await unmarkCommissionReceived(record.id)
          if (!res.error) setLocalStatus('earned')
        })}
        disabled={isPending}
        className="flex items-center gap-1 text-xs text-gray-400 hover:text-amber-600 transition"
        title="ยกเลิกการรับ"
      >
        {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
        <span className="hidden sm:inline">ยกเลิก</span>
      </button>
    )
  }

  return (
    <button
      onClick={() => startTransition(async () => {
        const res = await markCommissionReceived(record.id)
        if (!res.error) setLocalStatus('received')
      })}
      disabled={isPending}
      className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 hover:text-emerald-700 transition"
      title="รับค่าคอมแล้ว"
    >
      {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Circle className="w-3.5 h-3.5" />}
      รับค่าคอม
    </button>
  )
}

// ─── Status badge ─────────────────────────────────────────────

const STATUS_CONFIG = {
  pipeline: { label: 'Pipeline',  cls: 'bg-blue-100 text-blue-700' },
  earned:   { label: 'Earned',    cls: 'bg-emerald-100 text-emerald-700' },
  received: { label: 'Received',  cls: 'bg-gray-100 text-gray-600' },
}

const TYPE_CONFIG = {
  new_lease: { label: 'สัญญาใหม่', cls: 'bg-indigo-50 text-indigo-600' },
  renewal:   { label: 'ต่อสัญญา', cls: 'bg-amber-50 text-amber-600' },
}

// ─── Single record card ───────────────────────────────────────

function RecordCard({ record }: { record: CommissionRow }) {
  const contractId = record.lease_id ?? record.reservation_id
  const [status, setStatus] = useState(record.status)

  const inner = (
    <div className="flex items-start justify-between gap-3 p-4">
      {/* Left: info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${STATUS_CONFIG[status].cls}`}>
            {STATUS_CONFIG[status].label}
          </span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${TYPE_CONFIG[record.commission_type].cls}`}>
            {TYPE_CONFIG[record.commission_type].label}
          </span>
        </div>

        <p className="text-sm font-semibold text-gray-900">
          ฿{fmt(record.amount)}
        </p>

        {(record.project_name || record.stock_unit) && (
          <p className="text-xs text-gray-600 mt-0.5 truncate">
            {[record.project_name, record.stock_unit].filter(Boolean).join(' · ')}
          </p>
        )}
        {record.tenant_name && (
          <p className="text-xs text-gray-400 truncate">{record.tenant_name}</p>
        )}

        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          {contractId && (
            <span className="text-[10px] text-gray-400 font-mono">{contractId}</span>
          )}
          {status === 'received' && record.received_at && (
            <span className="text-[10px] text-gray-400">รับ {dateStr(record.received_at)}</span>
          )}
          {status === 'earned' && record.earned_at && (
            <span className="text-[10px] text-gray-400">Earned {dateStr(record.earned_at)}</span>
          )}
          {status === 'pipeline' && (
            <span className="text-[10px] text-gray-400">จอง {dateStr(record.created_at)}</span>
          )}
        </div>
      </div>

      {/* Right: icon + action */}
      <div className="flex flex-col items-end gap-2 flex-shrink-0">
        {status === 'received'
          ? <CheckCircle className="w-5 h-5 text-emerald-500" />
          : status === 'earned'
            ? <Circle className="w-5 h-5 text-emerald-200" />
            : <Circle className="w-5 h-5 text-blue-200" />
        }
        <MarkButton record={{ ...record, status }} />
      </div>
    </div>
  )

  if (contractId) {
    return (
      <div className="border-b border-gray-50 last:border-0">
        <div className="relative">
          <Link href={`/contracts/${contractId}`} className="block hover:bg-gray-50/60 transition">
            {inner}
          </Link>
        </div>
      </div>
    )
  }

  return <div className="border-b border-gray-50 last:border-0">{inner}</div>
}

// ─── Main export ──────────────────────────────────────────────

interface Props {
  records: CommissionRow[]
  pipeline: number
  earned: number
  received: number
  outstanding: number
}

export default function CommissionList({ records, pipeline, earned, received, outstanding }: Props) {
  const [filter, setFilter] = useState<Filter>('all')

  const tabs: { id: Filter; label: string; count: number }[] = [
    { id: 'all',      label: 'ทั้งหมด',  count: records.length },
    { id: 'pipeline', label: 'Pipeline', count: records.filter(r => r.status === 'pipeline').length },
    { id: 'earned',   label: 'Earned',   count: records.filter(r => r.status === 'earned').length },
    { id: 'received', label: 'Received', count: records.filter(r => r.status === 'received').length },
  ]

  const filtered = filter === 'all' ? records : records.filter(r => r.status === filter)

  return (
    <div className="space-y-5">
      {/* Summary grid */}
      <div className="grid grid-cols-2 gap-3">
        <SummaryCard label="Pipeline" amount={pipeline} color="blue" sub="จากใบจองที่ active" />
        <SummaryCard label="Earned" amount={earned} color="emerald" sub="จากสัญญาที่ลงนาม" />
        <SummaryCard label="Received" amount={received} color="gray" sub="รับแล้ว" />
        <SummaryCard label="Outstanding" amount={outstanding} color={outstanding > 0 ? 'amber' : 'gray'} sub="Earned − Received" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl overflow-x-auto scrollbar-none">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            className={`flex-1 min-w-0 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-medium transition whitespace-nowrap ${
              filter === tab.id
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                filter === tab.id ? 'bg-gray-100 text-gray-600' : 'bg-gray-200 text-gray-500'
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Record list */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm py-14 flex flex-col items-center text-gray-400">
          <p className="text-sm font-medium">ไม่มีรายการ</p>
          <p className="text-xs mt-1">สร้างใบจองที่มีค่าคอมเพื่อเริ่มติดตาม</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          {filtered.map(r => (
            <RecordCard key={r.id} record={r} />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Summary card ─────────────────────────────────────────────

function SummaryCard({
  label, amount, color, sub,
}: {
  label: string
  amount: number
  color: 'blue' | 'emerald' | 'gray' | 'amber'
  sub?: string
}) {
  const COLOR = {
    blue:    { bg: 'bg-blue-50',    text: 'text-blue-700',    label: 'text-blue-500' },
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-700', label: 'text-emerald-500' },
    gray:    { bg: 'bg-white',      text: 'text-gray-700',    label: 'text-gray-400' },
    amber:   { bg: 'bg-amber-50',   text: 'text-amber-700',   label: 'text-amber-500' },
  }
  const c = COLOR[color]
  return (
    <div className={`${c.bg} rounded-xl border border-gray-100 shadow-sm p-4`}>
      <p className={`text-xs font-medium ${c.label} mb-1`}>{label}</p>
      <p className={`text-2xl font-bold ${c.text}`}>฿{fmt(amount)}</p>
      {sub && <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>}
    </div>
  )
}
