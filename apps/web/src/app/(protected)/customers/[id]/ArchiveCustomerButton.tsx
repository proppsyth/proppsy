'use client'

import { useState, useTransition } from 'react'
import { Archive, ArchiveRestore } from 'lucide-react'
import { archiveCustomer, restoreCustomer } from '../actions'

interface Props {
  customerId: string
  isArchived: boolean
}

export default function ArchiveCustomerButton({ customerId, isArchived }: Props) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [confirm, setConfirm] = useState(false)

  function handleArchive() {
    setError(null)
    startTransition(async () => {
      const res = await archiveCustomer(customerId)
      if (res.error) setError(res.error)
    })
  }

  function handleRestore() {
    setError(null)
    startTransition(async () => {
      const res = await restoreCustomer(customerId)
      if (res.error) setError(res.error)
    })
  }

  if (isArchived) {
    return (
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
          <Archive className="w-3.5 h-3.5 flex-shrink-0" />
          ลูกค้านี้ถูกเก็บถาวรแล้ว
        </div>
        <button
          onClick={handleRestore}
          disabled={pending}
          className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-600 hover:bg-gray-50 transition disabled:opacity-50"
        >
          <ArchiveRestore className="w-3.5 h-3.5" />
          {pending ? 'กำลังกู้คืน...' : 'กู้คืน'}
        </button>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    )
  }

  if (confirm) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-2">
        <p className="text-xs text-amber-800 font-medium">เก็บถาวรลูกค้า?</p>
        <p className="text-xs text-amber-700">ลูกค้าจะไม่ปรากฏในรายการปกติ แต่ยังสามารถกู้คืนได้ภายหลัง</p>
        {error && <p className="text-xs text-red-600">{error}</p>}
        <div className="flex gap-2">
          <button
            onClick={handleArchive}
            disabled={pending}
            className="flex-1 py-1.5 bg-amber-600 text-white text-xs font-medium rounded-lg hover:bg-amber-700 transition disabled:opacity-50"
          >
            {pending ? 'กำลังเก็บ...' : 'ยืนยัน'}
          </button>
          <button
            onClick={() => setConfirm(false)}
            className="flex-1 py-1.5 border border-gray-200 text-gray-600 text-xs rounded-lg hover:bg-gray-50 transition"
          >
            ยกเลิก
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <button
        onClick={() => setConfirm(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-500 hover:bg-gray-50 hover:text-amber-700 hover:border-amber-200 transition"
      >
        <Archive className="w-3.5 h-3.5" />
        เก็บถาวร
      </button>
    </div>
  )
}
