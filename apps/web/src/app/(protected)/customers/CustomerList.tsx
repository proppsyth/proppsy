'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Search, Users, Bell } from 'lucide-react'
import { customerDisplayName } from '@/types'
import type { Customer, LeadStatus } from '@/types'

const SOURCE_LABELS: Record<string, string> = {
  line_oa: 'LINE OA',
  referral: 'แนะนำ',
  walk_in: 'Walk-in',
  online: 'ออนไลน์',
}

export const LEAD_STATUS_CONFIG: Record<LeadStatus, { label: string; className: string }> = {
  lead:        { label: 'Lead',       className: 'bg-gray-100 text-gray-600' },
  prospect:    { label: 'Prospect',   className: 'bg-blue-100 text-blue-700' },
  viewing:     { label: 'นัดชม',      className: 'bg-yellow-100 text-yellow-700' },
  negotiating: { label: 'เจรจา',      className: 'bg-orange-100 text-orange-700' },
  converted:   { label: 'ปิดดีล',     className: 'bg-green-100 text-green-700' },
  lost:        { label: 'เสียลูกค้า', className: 'bg-red-100 text-red-600' },
}

const LEAD_STATUS_ORDER: LeadStatus[] = ['lead', 'prospect', 'viewing', 'negotiating', 'converted', 'lost']

interface Props {
  customers: Customer[]
  showArchived?: boolean
}

export default function CustomerList({ customers, showArchived }: Props) {
  const [search, setSearch] = useState('')
  const [followUpOnly, setFollowUpOnly] = useState(false)
  const [leadFilter, setLeadFilter] = useState<LeadStatus | null>(null)

  const filtered = customers.filter(c => {
    if (followUpOnly && !c.follow_up) return false
    if (leadFilter && c.lead_status !== leadFilter) return false
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      c.nickname?.toLowerCase().includes(q) ||
      c.first_name_th?.toLowerCase().includes(q) ||
      c.last_name_th?.toLowerCase().includes(q) ||
      c.phone?.includes(q) ||
      c.national_id?.includes(q) ||
      c.id.toLowerCase().includes(q)
    )
  })

  const hasFilter = !!search || followUpOnly || !!leadFilter

  return (
    <div>
      {/* Controls */}
      <div className="flex items-center gap-2 mb-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="ค้นหาชื่อ, เบอร์โทร..."
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          />
        </div>
        <button
          type="button"
          onClick={() => setFollowUpOnly(v => !v)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm font-medium transition ${
            followUpOnly
              ? 'bg-orange-100 text-orange-700 border-orange-200'
              : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
          }`}
        >
          <Bell className="w-4 h-4" />
          ติดตาม
        </button>
      </div>

      {/* Lead status filter chips */}
      <div className="flex gap-1.5 flex-wrap mb-4">
        <button
          type="button"
          onClick={() => setLeadFilter(null)}
          className={`px-2.5 py-1 text-xs font-medium rounded-full border transition ${
            !leadFilter ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
          }`}
        >
          ทั้งหมด
        </button>
        {LEAD_STATUS_ORDER.map(s => {
          const cfg = LEAD_STATUS_CONFIG[s]
          const active = leadFilter === s
          return (
            <button
              key={s}
              type="button"
              onClick={() => setLeadFilter(active ? null : s)}
              className={`px-2.5 py-1 text-xs font-medium rounded-full border transition ${
                active ? cfg.className + ' border-current' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
              }`}
            >
              {cfg.label}
            </button>
          )
        })}
      </div>

      {/* Empty */}
      {filtered.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <Users className="w-6 h-6 text-gray-400" />
          </div>
          <p className="text-gray-500 font-medium mb-1">
            {hasFilter ? 'ไม่พบลูกค้าที่ค้นหา' : showArchived ? 'ไม่มีลูกค้าที่เก็บถาวร' : 'ยังไม่มีลูกค้า'}
          </p>
          <p className="text-gray-400 text-sm">
            {hasFilter ? 'ลองปรับตัวกรอง' : showArchived ? '' : 'กดปุ่ม "เพิ่มลูกค้า" เพื่อเริ่มต้น'}
          </p>
        </div>
      )}

      {/* List */}
      {filtered.length > 0 && (
        <div className="space-y-2">
          {filtered.map(c => <CustomerRow key={c.id} customer={c} />)}
        </div>
      )}
    </div>
  )
}

function CustomerRow({ customer: c }: { customer: Customer }) {
  const name = customerDisplayName(c)
  const initial = name.charAt(0) || '?'
  const leadCfg = c.lead_status ? LEAD_STATUS_CONFIG[c.lead_status as LeadStatus] : null

  return (
    <Link
      href={`/customers/${c.id}`}
      className="flex items-center gap-3 bg-white rounded-xl border border-gray-100 shadow-sm p-3.5 hover:shadow-md hover:border-blue-200 transition-all"
    >
      <div className="w-10 h-10 bg-violet-100 rounded-full flex items-center justify-center text-violet-700 font-semibold text-sm flex-shrink-0 relative">
        {initial}
        {c.follow_up && (
          <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-orange-400 rounded-full border-2 border-white" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-900 text-sm">{name}</p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          {c.phone && <span className="text-xs text-gray-400">{c.phone}</span>}
          {c.source && (
            <span className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded-full">
              {SOURCE_LABELS[c.source] ?? c.source}
            </span>
          )}
          {leadCfg && (
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${leadCfg.className}`}>
              {leadCfg.label}
            </span>
          )}
        </div>
      </div>
      <span className="text-xs text-gray-300 flex-shrink-0">{c.id}</span>
    </Link>
  )
}
