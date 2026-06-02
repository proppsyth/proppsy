'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import { deleteContract } from '../actions'

interface Props {
  contractId: string
}

export default function DeleteContractButton({ contractId }: Props) {
  const router = useRouter()
  const [confirm, setConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleDelete() {
    setLoading(true)
    setError(null)
    const result = await deleteContract(contractId)
    setLoading(false)
    if (result.error) {
      setError(result.error)
      setConfirm(false)
    } else {
      router.push('/contracts')
    }
  }

  if (confirm) {
    return (
      <div className="flex items-center gap-2">
        {error && <p className="text-xs text-red-500">{error}</p>}
        <button
          onClick={handleDelete}
          disabled={loading}
          className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition disabled:opacity-50"
        >
          {loading ? '...' : 'ยืนยันลบ'}
        </button>
        <button
          onClick={() => setConfirm(false)}
          disabled={loading}
          className="px-3 py-2 border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 text-sm font-medium rounded-lg transition"
        >
          ยกเลิก
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => setConfirm(true)}
      className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 bg-white hover:bg-red-50 hover:border-red-200 text-gray-400 hover:text-red-600 text-sm font-medium rounded-lg transition"
      title="ลบสัญญา (เฉพาะร่าง/ยกเลิก/บอกเลิก)"
    >
      <Trash2 className="w-3.5 h-3.5" />
      ลบ
    </button>
  )
}
