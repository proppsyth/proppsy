'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Search, FileText, RotateCcw, Trash2, Loader2 } from 'lucide-react'
import { DOC_TYPE_LABELS } from '@/types'
import type { ContractDocType, ContractStatus, ContractCategory } from '@/types'
import { restoreContract, hardDeleteContract } from './actions'

const STATUS_COLORS: Record<ContractStatus, string> = {
  draft:              'bg-gray-100 text-gray-600',
  sent:               'bg-yellow-100 text-yellow-700',
  sent_for_sign:      'bg-yellow-100 text-yellow-700',
  viewed:             'bg-blue-100 text-blue-700',
  partially_signed:   'bg-orange-100 text-orange-700',
  signed:             'bg-green-100 text-green-700',
  finalized:          'bg-emerald-100 text-emerald-700',
  active:             'bg-emerald-100 text-emerald-700',
  completed:          'bg-emerald-100 text-emerald-700',
  cancelled:          'bg-red-100 text-red-600',
  terminated:         'bg-rose-100 text-rose-700',
  renewed:            'bg-purple-100 text-purple-700',
  converted_to_lease: 'bg-blue-100 text-blue-700',
}

const STATUS_LABELS_TH: Record<ContractStatus, string> = {
  draft:              'ร่าง',
  sent:               'ส่งแล้ว',
  sent_for_sign:      'ส่งเซ็นแล้ว',
  viewed:             'เปิดดูแล้ว',
  partially_signed:   'ลงนามบางส่วน',
  signed:             'ลงนามแล้ว',
  finalized:          'ล็อกแล้ว',
  active:             'มีผลแล้ว',
  completed:          'เสร็จสมบูรณ์',
  cancelled:          'ยกเลิก',
  terminated:         'บอกเลิกแล้ว',
  renewed:            'ต่อสัญญาแล้ว',
  converted_to_lease: 'แปลงเป็นสัญญาเช่า',
}

export interface ContractRow {
  id: string
  doc_type: string
  status: string
  created_at: string
  move_in_date?: string | null
  is_finalized?: boolean
  contract_category?: string | null
  stock?: { project_name?: string | null; unit_no?: string | null } | null
  owner?: { first_name_th?: string | null; last_name_th?: string | null; nickname?: string | null } | null
  customer?: { first_name_th?: string | null; last_name_th?: string | null; nickname?: string | null } | null
}

interface Props {
  contracts: ContractRow[]
  trashMode?: boolean
}

export default function ContractList({ contracts, trashMode = false }: Props) {
  const [search, setSearch] = useState('')

  const q = search.trim().toLowerCase()

  const filtered = q
    ? contracts.filter(c => {
        const stock = c.stock
        const owner = c.owner
        const customer = c.customer
        const ownerName = owner
          ? (owner.nickname || [owner.first_name_th, owner.last_name_th].filter(Boolean).join(' '))
          : ''
        const customerName = customer
          ? (customer.nickname || [customer.first_name_th, customer.last_name_th].filter(Boolean).join(' '))
          : ''
        return (
          c.id.toLowerCase().includes(q) ||
          stock?.project_name?.toLowerCase().includes(q) ||
          stock?.unit_no?.toLowerCase().includes(q) ||
          ownerName.toLowerCase().includes(q) ||
          customerName.toLowerCase().includes(q)
        )
      })
    : contracts

  return (
    <div>
      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="ค้นหาเลขสัญญา, ชื่อผู้เช่า, เจ้าของ, โครงการ, เลขห้อง..."
          className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white transition"
        />
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <FileText className="w-6 h-6 text-gray-400" />
          </div>
          <p className="text-gray-500 font-medium mb-1">
            {q ? 'ไม่พบสัญญาที่ค้นหา' : 'ยังไม่มีสัญญา'}
          </p>
          <p className="text-gray-400 text-sm">
            {q ? 'ลองค้นหาด้วยคำอื่น' : 'กดปุ่ม "สร้างสัญญา" เพื่อเริ่มต้น'}
          </p>
        </div>
      )}

      {/* List */}
      {filtered.length > 0 && (
        <div className="space-y-2">
          {q && (
            <p className="text-xs text-gray-400 mb-2">พบ {filtered.length} รายการ</p>
          )}
          {filtered.map(c => {
            const stock = c.stock
            const owner = c.owner
            const customer = c.customer
            const propertyLabel = stock
              ? [stock.project_name, stock.unit_no].filter(Boolean).join(' · ')
              : null
            const ownerName = owner
              ? (owner.nickname || [owner.first_name_th, owner.last_name_th].filter(Boolean).join(' '))
              : null
            const customerName = customer
              ? (customer.nickname || [customer.first_name_th, customer.last_name_th].filter(Boolean).join(' '))
              : null
            const parties = [ownerName, customerName].filter(Boolean).join(' / ')
            const category = c.contract_category as ContractCategory | undefined
            const categoryColor = category === 'reservation'
              ? 'bg-amber-50 text-amber-700'
              : category === 'lease'
                ? 'bg-blue-50 text-blue-700'
                : 'bg-gray-50 text-gray-500'

            return (
              <Link
                key={c.id}
                href={`/contracts/${c.id}`}
                className="flex items-center gap-3 bg-white rounded-xl border border-gray-100 shadow-sm p-3.5 hover:shadow-md hover:border-blue-200 transition-all"
              >
                <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <FileText className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-gray-900">{c.id}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[c.status as ContractStatus] ?? 'bg-gray-100 text-gray-600'}`}>
                      {STATUS_LABELS_TH[c.status as ContractStatus] ?? c.status}
                    </span>
                    {category && (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${categoryColor}`}>
                        {category === 'reservation' ? 'ใบจอง' : category === 'lease' ? 'สัญญาเช่า' : 'อ้างอิง'}
                      </span>
                    )}
                    {c.is_finalized && (
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-green-100 text-green-700">ล็อก</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {DOC_TYPE_LABELS[c.doc_type as ContractDocType] ?? c.doc_type}
                    {propertyLabel && <span className="text-gray-400"> · {propertyLabel}</span>}
                  </p>
                  {parties && (
                    <p className="text-xs text-gray-400 mt-0.5 truncate">{parties}</p>
                  )}
                </div>
                {trashMode ? (
                  <TrashActions contractId={c.id} />
                ) : (
                  <p className="text-xs text-gray-400 flex-shrink-0 ml-2">
                    {new Date(c.created_at).toLocaleDateString('th-TH', { month: 'short', day: 'numeric' })}
                  </p>
                )}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

function TrashActions({ contractId }: { contractId: string }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [confirmDel, setConfirmDel] = useState(false)

  const stop = (e: React.MouseEvent) => { e.preventDefault(); e.stopPropagation() }

  return (
    <div className="flex items-center gap-1.5 flex-shrink-0 ml-2" onClick={stop}>
      <button
        type="button"
        title="กู้คืน"
        disabled={pending}
        onClick={(e) => { stop(e); start(async () => { await restoreContract(contractId); router.refresh() }) }}
        className="flex items-center gap-1 px-2 py-1.5 text-xs text-blue-600 hover:bg-blue-50 rounded-lg transition disabled:opacity-50"
      >
        {pending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
        กู้คืน
      </button>
      {confirmDel ? (
        <button
          type="button"
          disabled={pending}
          onClick={(e) => { stop(e); start(async () => { await hardDeleteContract(contractId); router.refresh() }) }}
          className="px-2 py-1.5 text-xs text-white bg-red-600 hover:bg-red-700 rounded-lg transition disabled:opacity-50"
        >
          ยืนยันลบถาวร
        </button>
      ) : (
        <button
          type="button"
          title="ลบถาวร"
          onClick={(e) => { stop(e); setConfirmDel(true) }}
          className="flex items-center gap-1 px-2 py-1.5 text-xs text-red-500 hover:bg-red-50 rounded-lg transition"
        >
          <Trash2 className="w-3.5 h-3.5" />
          ลบถาวร
        </button>
      )}
    </div>
  )
}
