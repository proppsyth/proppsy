import type { Metadata } from 'next'
import { Package, Check, Users } from 'lucide-react'
import { PLAN_META } from '@/types'
import { createAdminClient } from '@/lib/supabase/server'
import { getAllPlanLimits } from '@/lib/planLimits'
import PlanEditor from './PlanEditor'

export const metadata: Metadata = { title: 'จัดการแพ็กเกจ — Admin' }

const PLANS = ['starter', 'professional', 'business'] as const

export default async function AdminPackagesPage() {
  const admin = await createAdminClient()

  const [
    { count: starterCount },
    { count: proCount },
    { count: businessCount },
    planLimits,
  ] = await Promise.all([
    admin.from('profiles').select('*', { count: 'exact', head: true }).eq('plan', 'starter').neq('role', 'admin'),
    admin.from('profiles').select('*', { count: 'exact', head: true }).eq('plan', 'professional').neq('role', 'admin'),
    admin.from('profiles').select('*', { count: 'exact', head: true }).eq('plan', 'business').neq('role', 'admin'),
    getAllPlanLimits(),
  ])

  const planUserCounts: Record<string, number> = {
    starter: starterCount ?? 0,
    professional: proCount ?? 0,
    business: businessCount ?? 0,
  }

  const totalUsers = (starterCount ?? 0) + (proCount ?? 0) + (businessCount ?? 0)

  return (
    <div className="p-4 lg:p-8 pt-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 bg-purple-50 rounded-xl flex items-center justify-center flex-shrink-0">
            <Package className="w-5 h-5 text-purple-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">จัดการแพ็กเกจ</h1>
        </div>
        <p className="text-sm text-gray-400 ml-12">สร้าง แก้ไข และกำหนดขีดจำกัดของแพ็กเกจ</p>
      </div>

      {/* User summary */}
      <div className="flex items-center gap-2 px-4 py-3 bg-purple-50 border border-purple-100 rounded-xl mb-5 text-xs text-purple-700">
        <Users className="w-4 h-4 flex-shrink-0" />
        <span>ผู้ใช้ทั้งหมด {totalUsers.toLocaleString()} คน (ไม่รวม admin)</span>
      </div>

      {/* Plan cards */}
      <div className="grid sm:grid-cols-3 gap-4 mb-8">
        {PLANS.map((plan) => {
          const meta = PLAN_META[plan]
          const row = planLimits[plan]
          const userCount = planUserCounts[plan] ?? 0
          if (!row) return null
          return (
            <div key={plan} className="bg-white rounded-xl border border-gray-100 p-5">
              <div className="flex items-center justify-between mb-3">
                <span className={`text-sm font-semibold px-2.5 py-1 rounded-lg ${meta.badge}`}>
                  {meta.label}
                </span>
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <Users className="w-3.5 h-3.5" />
                  <span className="font-semibold text-gray-800">{userCount.toLocaleString()}</span>
                  <span>ผู้ใช้</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Check className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                  <span>ทรัพย์: {row.max_stock === null ? 'ไม่จำกัด' : `${row.max_stock} รายการ`}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Check className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                  <span>สัญญา: {row.max_contracts_per_month === null ? 'ไม่จำกัด' : `${row.max_contracts_per_month}/เดือน`}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Check className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                  <span>AI: {row.ai_calls_per_month} ครั้ง/เดือน</span>
                </div>
              </div>
              <PlanEditor
                plan={plan}
                label={meta.label}
                badge={meta.badge}
                row={row}
              />
            </div>
          )
        })}
      </div>

      <p className="text-xs text-gray-400 text-center">
        การเปลี่ยนแปลงมีผลทันที — ค่าว่างในช่อง &quot;ทรัพย์&quot; และ &quot;สัญญา&quot; หมายถึงไม่จำกัด
      </p>
    </div>
  )
}
