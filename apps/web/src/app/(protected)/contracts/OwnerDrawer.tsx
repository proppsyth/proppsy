'use client'

import { X, User } from 'lucide-react'
import OwnerForm from '@/app/(protected)/owners/OwnerForm'
import type { Owner } from '@/types'

interface Props {
  onCreated: (id: string, label: string) => void
  onClose: () => void
  // When provided, the drawer opens in edit mode for the given owner
  ownerId?: string
  initialData?: Owner
}

export default function OwnerDrawer({ onCreated, onClose, ownerId, initialData }: Props) {
  const isEdit = !!ownerId
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col bg-white">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 flex-shrink-0 bg-white">
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-blue-600" />
          <h2 className="text-base font-bold text-gray-900">
            {isEdit ? 'แก้ไขข้อมูลเจ้าของทรัพย์' : 'เพิ่มเจ้าของทรัพย์ใหม่'}
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <OwnerForm ownerId={ownerId} initialData={initialData} onCreated={onCreated} onCancel={onClose} />
      </div>
    </div>
  )
}
