'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, Loader2 } from 'lucide-react'
import { deleteStock } from '../actions'

export default function DeleteStockButton({ stockId }: { stockId: string }) {
  const router = useRouter()
  const [confirm, setConfirm] = useState(false)
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  function handleDelete() {
    setError('')
    startTransition(async () => {
      const res = await deleteStock(stockId)
      if (res.error) { setError(res.error); setConfirm(false); return }
      router.push('/stock')
    })
  }

  if (!confirm) {
    return (
      <button
        type="button"
        onClick={() => setConfirm(true)}
        className="flex items-center gap-1.5 px-4 py-2 border border-red-200 text-red-600 hover:bg-red-50 text-sm font-medium rounded-lg transition flex-shrink-0"
      >
        <Trash2 className="w-3.5 h-3.5" />
        ลบ
      </button>
    )
  }

  return (
    <div className="flex flex-col gap-2 items-end">
      <p className="text-xs text-red-600 font-medium">ยืนยันลบทรัพย์นี้?</p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setConfirm(false)}
          className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition"
        >
          ยกเลิก
        </button>
        <button
          type="button"
          onClick={handleDelete}
          disabled={isPending}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition disabled:opacity-50"
        >
          {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
          {isPending ? 'กำลังลบ...' : 'ยืนยันลบ'}
        </button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
