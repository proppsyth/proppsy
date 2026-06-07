'use client'

import { useState, useTransition } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Globe } from 'lucide-react'
import { togglePartnerActive, deletePartner } from './actions'

interface Partner {
  id: string
  name_th: string
  name_en?: string | null
  logo_url?: string | null
  website?: string | null
  sort_order: number
  is_active: boolean
}

export default function PartnerCard({ partner }: { partner: Partner }) {
  const [active, setActive]               = useState(partner.is_active)
  const [togglePending, startToggle]      = useTransition()
  const [deletePending, startDelete]      = useTransition()
  const [confirmDelete, setConfirmDelete] = useState(false)

  function handleToggle() {
    const prev = active
    setActive(!prev)
    startToggle(async () => { await togglePartnerActive(partner.id, prev) })
  }

  function handleDeleteClick() {
    if (!confirmDelete) { setConfirmDelete(true); return }
    startDelete(async () => { await deletePartner(partner.id) })
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex gap-4 items-center">
      {/* Logo / initial */}
      <div className="w-14 h-14 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0 flex items-center justify-center">
        {partner.logo_url ? (
          <Image src={partner.logo_url} alt={partner.name_th} width={56} height={56} className="object-contain w-full h-full p-1" />
        ) : (
          <span className="text-2xl font-bold text-gray-300">
            {partner.name_th.charAt(0)}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
            {active ? 'แสดงบนเว็บ' : 'ซ่อน'}
          </span>
          <span className="text-xs text-gray-400">ลำดับ #{partner.sort_order}</span>
        </div>
        <p className="font-medium text-gray-900 text-sm">{partner.name_th}</p>
        {partner.name_en && <p className="text-xs text-gray-400 mt-0.5">{partner.name_en}</p>}
        {partner.website && (
          <a href={partner.website} target="_blank" rel="noopener noreferrer"
            className="text-xs text-blue-500 flex items-center gap-1 mt-0.5 hover:underline max-w-xs truncate">
            <Globe className="w-3 h-3 flex-shrink-0" />
            {partner.website}
          </a>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-col items-end gap-2 flex-shrink-0">
        <button
          type="button"
          onClick={handleToggle}
          disabled={togglePending}
          title={active ? 'คลิกเพื่อซ่อน' : 'คลิกเพื่อแสดง'}
          className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 disabled:opacity-50 ${active ? 'bg-green-500' : 'bg-gray-200'}`}
        >
          <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${active ? 'translate-x-5' : ''}`} />
        </button>
        <div className="flex items-center gap-1.5">
          <Link
            href={`/admin/partners/${partner.id}/edit`}
            className="px-3 py-1.5 text-xs font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg transition"
          >
            แก้ไข
          </Link>
          <button
            onClick={handleDeleteClick}
            onBlur={() => setConfirmDelete(false)}
            disabled={deletePending}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition disabled:opacity-50 ${
              confirmDelete ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-red-50 text-red-600 hover:bg-red-100'
            }`}
          >
            {deletePending ? '...' : confirmDelete ? 'ยืนยันลบ?' : 'ลบ'}
          </button>
        </div>
      </div>
    </div>
  )
}
