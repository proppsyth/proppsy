import type { Metadata } from 'next'
import { Receipt } from 'lucide-react'

export const metadata: Metadata = { title: 'Billing — Admin' }

export default function AdminBillingPage() {
  return (
    <div className="p-4 lg:p-8 pt-6">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 bg-green-50 rounded-xl flex items-center justify-center flex-shrink-0">
            <Receipt className="w-5 h-5 text-green-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">Billing</h1>
        </div>
        <p className="text-sm text-gray-400 ml-12">ภาพรวมรายได้ การชำระเงิน และ Subscription</p>
      </div>

      <div className="grid sm:grid-cols-4 gap-3 mb-8">
        {['รายได้เดือนนี้', 'Subscription ที่ active', 'การชำระรอดำเนินการ', 'รายได้สะสม'].map((label) => (
          <div key={label} className="bg-white rounded-xl border border-gray-100 p-4">
            <p className="text-2xl font-bold text-gray-300">—</p>
            <p className="text-xs text-gray-400 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
        <Receipt className="w-12 h-12 mx-auto mb-4 text-gray-200" />
        <p className="text-gray-500 font-medium">Billing Dashboard</p>
        <p className="text-gray-400 text-sm mt-1">ดูรายการ Omise transactions ประวัติการชำระเงิน และจัดการ Subscription</p>
        <span className="inline-flex items-center gap-1 mt-3 px-3 py-1 bg-green-50 text-green-600 text-xs font-medium rounded-full">
          Coming Soon
        </span>
      </div>
    </div>
  )
}
