'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Search, Users, Bell } from 'lucide-react'
import { customerDisplayName } from '@/types'
import type { Customer } from '@/types'

const SOURCE_LABELS: Record<string, string> = {
  line_oa: 'LINE OA',
  referral: 'แนะนำ',
  walk_in: 'Walk-in',
  online: 'ออนไลน์',
}

interface Props {
  customers: Customer[]
}

export default function CustomerList({ customers }: Props) {
  const [search, setSearch] = useState('')
  const [followUpOnly, setFollowUpOnly] = useState(false)

  const filtered = customers.filter(c => {
    if (followUpOnly && !c.follow_up) return false
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

      {/* Empty */}
      {filtered.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <Users className="w-6 h-6 text-gray-400" />
          </div>
          <p className="text-gray-500 font-medium mb-1">
            {search || followUpOnly ? 'ไม่พบลูกค้าที่ค้นหา' : 'ยังไม่มีลูกค้า'}
          </p>
          <p className="text-gray-400 text-sm">
            {search || followUpOnly ? 'ลองปรับตัวกรอง' : 'กดปุ่ม "เพิ่มลูกค้า" เพื่อเริ่มต้น'}
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
        </div>
      </div>
      <span className="text-xs text-gray-300 flex-shrink-0">{c.id}</span>
    </Link>
  )
}
