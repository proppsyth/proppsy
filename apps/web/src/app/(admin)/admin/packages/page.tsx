import type { Metadata } from 'next'
import { Package, Check } from 'lucide-react'
import { PLAN_META, PLAN_LIMITS } from '@/types'

export const metadata: Metadata = { title: 'จัดการแพ็กเกจ — Admin' }

const PLANS = ['starter', 'professional', 'business'] as const

export default function AdminPackagesPage() {
  return (
    <div className="p-4 lg:p-8 pt-6">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 bg-purple-50 rounded-xl flex items-center justify-center flex-shrink-0">
            <Package className="w-5 h-5 text-purple-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">จัดการแพ็กเกจ</h1>
        </div>
        <p className="text-sm text-gray-400 ml-12">สร้าง แก้ไข และกำหนดขีดจำกัดของแพ็กเกจ</p>
      </div>

      {/* Current plans overview */}
      <div className="grid sm:grid-cols-3 gap-4 mb-8">
        {PLANS.map((plan) => {
          const meta = PLAN_META[plan]
          const limits = PLAN_LIMITS[plan]
          return (
            <div key={plan} className="bg-white rounded-xl border border-gray-100 p-5">
              <div className="flex items-center justify-between mb-3">
                <span className={`text-sm font-semibold px-2.5 py-1 rounded-lg ${meta.badge}`}>
                  {meta.label}
                </span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Check className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                  <span>ทรัพย์: {limits.maxStock === null ? 'ไม่จำกัด' : `${limits.maxStock} รายการ`}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Check className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                  <span>สัญญา: {limits.maxContractsPerMonth === null ? 'ไม่จำกัด' : `${limits.maxContractsPerMonth}/เดือน`}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Check className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                  <span>AI: {limits.aiCallsPerMonth} ครั้ง/เดือน</span>
                </div>
              </div>
              <button className="mt-4 w-full py-2 border border-gray-200 text-gray-500 text-sm rounded-xl hover:bg-gray-50 transition opacity-50 cursor-not-allowed" disabled>
                แก้ไข (เร็วๆ นี้)
              </button>
            </div>
          )
        })}
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
        <Package className="w-12 h-12 mx-auto mb-4 text-gray-200" />
        <p className="text-gray-500 font-medium">Package Management</p>
        <p className="text-gray-400 text-sm mt-1">ตั้งราคา จำกัดฟีเจอร์ กำหนด AI limits และเปิดใช้งานแบบ manual</p>
        <span className="inline-flex items-center gap-1 mt-3 px-3 py-1 bg-purple-50 text-purple-600 text-xs font-medium rounded-full">
          Coming Soon
        </span>
      </div>
    </div>
  )
}
