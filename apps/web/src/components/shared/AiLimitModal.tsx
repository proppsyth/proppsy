'use client'
import { X } from 'lucide-react'
import Link from 'next/link'
import type { AiQuotaInfo } from '@/lib/aiQuota'

interface Props {
  quota: AiQuotaInfo
  onClose: () => void
}

export function AiLimitModal({ quota, onClose }: Props) {
  const pct = quota.limit > 0 ? Math.min((quota.used / quota.limit) * 100, 100) : 100

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-2xl w-full max-w-sm p-5 shadow-xl">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-bold text-gray-900">โควต้า AI เต็มแล้ว</h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm text-gray-600 mb-4">
          คุณใช้ AI ครบ <strong>{quota.limit}</strong> ครั้งสำหรับเดือนนี้แล้ว
          โควต้าจะรีเซ็ตอัตโนมัติต้นเดือนหน้า
        </p>

        <div className="bg-gray-50 rounded-xl p-3 mb-4">
          <div className="flex justify-between text-xs text-gray-500 mb-1.5">
            <span>ใช้ไปแล้วเดือนนี้</span>
            <span className="font-medium text-red-500">{quota.used}/{quota.limit}</span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-red-400 rounded-full transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50 transition"
          >
            ปิด
          </button>
          <Link
            href="/services"
            className="flex-1 text-center px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition"
          >
            อัปเกรดแพ็กเกจ
          </Link>
        </div>
      </div>
    </div>
  )
}
