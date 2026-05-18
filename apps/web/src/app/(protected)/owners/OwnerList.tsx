'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Search, User } from 'lucide-react'
import { ownerDisplayName } from '@/types'
import type { Owner } from '@/types'

interface Props {
  owners: Owner[]
  showArchived?: boolean
}

export default function OwnerList({ owners, showArchived }: Props) {
  const [search, setSearch] = useState('')

  const filtered = search.trim()
    ? owners.filter(o => {
        const q = search.toLowerCase()
        return (
          o.nickname?.toLowerCase().includes(q) ||
          o.first_name_th?.toLowerCase().includes(q) ||
          o.last_name_th?.toLowerCase().includes(q) ||
          o.phone?.includes(q) ||
          o.national_id?.includes(q) ||
          o.id.toLowerCase().includes(q)
        )
      })
    : owners

  return (
    <div>
      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="ค้นหาชื่อ, เบอร์โทร, เลขบัตร..."
          className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        />
      </div>

      {/* Empty */}
      {filtered.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <User className="w-6 h-6 text-gray-400" />
          </div>
          <p className="text-gray-500 font-medium mb-1">
            {search ? 'ไม่พบเจ้าของที่ค้นหา' : showArchived ? 'ไม่มีเจ้าของที่เก็บถาวร' : 'ยังไม่มีเจ้าของทรัพย์'}
          </p>
          <p className="text-gray-400 text-sm">
            {search ? 'ลองค้นหาด้วยคำอื่น' : showArchived ? '' : 'กดปุ่ม "เพิ่มเจ้าของ" เพื่อเริ่มต้น'}
          </p>
        </div>
      )}

      {/* List */}
      {filtered.length > 0 && (
        <div className="space-y-2">
          {filtered.map(o => <OwnerRow key={o.id} owner={o} />)}
        </div>
      )}
    </div>
  )
}

function OwnerRow({ owner: o }: { owner: Owner }) {
  const name = ownerDisplayName(o)
  const initial = name.charAt(0) || '?'

  const idDisplay = o.national_id
    ? o.national_id.replace(/(\d)(\d{4})(\d{5})(\d{2})(\d)/, '$1-$2-$3-$4-$5')
    : null

  return (
    <Link
      href={`/owners/${o.id}`}
      className="flex items-center gap-3 bg-white rounded-xl border border-gray-100 shadow-sm p-3.5 hover:shadow-md hover:border-blue-200 transition-all"
    >
      <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center text-orange-700 font-semibold text-sm flex-shrink-0">
        {initial}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-900 text-sm">{name}</p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          {o.phone && <span className="text-xs text-gray-400">{o.phone}</span>}
          {o.phone && idDisplay && <span className="text-xs text-gray-300">·</span>}
          {idDisplay && <span className="text-xs text-gray-400">{idDisplay}</span>}
        </div>
      </div>
      <span className="text-xs text-gray-300 flex-shrink-0">{o.id}</span>
    </Link>
  )
}
