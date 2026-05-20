import type { Metadata } from 'next'
import Link from 'next/link'
import { Package, Check, Users, AlertCircle, TrendingUp } from 'lucide-react'
import { PLAN_META, resolvePlan } from '@/types'
import type { Plan } from '@/types'
import { createAdminClient } from '@/lib/supabase/server'
import { getAllPlanLimits } from '@/lib/planLimits'
import PlanEditor from './PlanEditor'
import UserPlanActions from './UserPlanActions'

export const metadata: Metadata = { title: 'จัดการแพ็กเกจ — Admin' }
export const dynamic = 'force-dynamic'

const PLANS = ['starter', 'professional', 'business'] as const

function fmt(n: number) { return new Intl.NumberFormat('th-TH').format(n) }

function ExpiryBadge({ expiresAt }: { expiresAt: string | null }) {
  if (!expiresAt) return <span className="text-[10px] text-gray-400">ไม่มีกำหนด</span>
  const d = new Date(expiresAt)
  const now = new Date()
  const expired = d < now
  const soon = !expired && (d.getTime() - now.getTime()) < 7 * 24 * 60 * 60 * 1000
  const label = d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })
  if (expired) return <span className="text-[10px] text-red-500 font-medium">หมดอายุ {label}</span>
  if (soon) return <span className="text-[10px] text-orange-500 font-medium">หมดอายุ {label}</span>
  return <span className="text-[10px] text-gray-500">{label}</span>
}

export default async function AdminPackagesPage() {
  const admin = await createAdminClient()

  const [planLimits, { data: allUsers }] = await Promise.all([
    getAllPlanLimits(),
    admin
      .from('profiles')
      .select('id, name, email, nickname, plan, plan_expires_at, account_status')
      .neq('role', 'admin')
      .order('plan')
      .order('created_at', { ascending: false }),
  ])

  const byPlan: Record<string, typeof allUsers> = { starter: [], professional: [], business: [] }
  for (const u of allUsers ?? []) {
    const p = resolvePlan(u.plan)
    byPlan[p] = [...(byPlan[p] ?? []), u]
  }

  const totalUsers = (allUsers ?? []).length
  const totalMRR = (allUsers ?? []).reduce((sum, u) => {
    const row = planLimits[resolvePlan(u.plan)]
    return sum + (row?.price_monthly_thb ?? 0)
  }, 0)

  return (
    <div className="p-4 lg:p-8 pt-6 max-w-6xl">
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 bg-purple-50 rounded-xl flex items-center justify-center flex-shrink-0">
              <Package className="w-5 h-5 text-purple-600" />
            </div>
            <h1 className="text-xl font-bold text-gray-900">จัดการแพ็กเกจ</h1>
          </div>
          <p className="text-sm text-gray-400 ml-12">แก้ไขขีดจำกัด ราคา และฟีเจอร์ของแต่ละแพ็กเกจ</p>
        </div>
        <Link
          href="/admin/users"
          className="text-xs text-blue-600 hover:underline self-start sm:self-center whitespace-nowrap"
        >
          จัดการผู้ใช้ทั้งหมด →
        </Link>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <StatCard icon={<Users className="w-4 h-4 text-blue-500" />} label="ผู้ใช้ทั้งหมด" value={`${fmt(totalUsers)} คน`} />
        <StatCard icon={<TrendingUp className="w-4 h-4 text-green-500" />} label="MRR (ประมาณ)" value={`฿${fmt(totalMRR)}`} />
        {PLANS.map(plan => (
          <StatCard
            key={plan}
            icon={<span className={`text-xs font-bold px-1.5 py-0.5 rounded ${PLAN_META[plan].badge}`}>{PLAN_META[plan].label[0]}</span>}
            label={PLAN_META[plan].label}
            value={`${fmt(byPlan[plan]?.length ?? 0)} คน`}
          />
        ))}
      </div>

      {/* Plan cards */}
      <div className="grid lg:grid-cols-3 gap-5 mb-8">
        {PLANS.map((plan) => {
          const meta = PLAN_META[plan]
          const row = planLimits[plan]
          const users = byPlan[plan] ?? []
          if (!row) return null

          const planMRR = users.length * (row.price_monthly_thb ?? 0)

          return (
            <div key={plan} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              {/* Plan header */}
              <div className="px-5 py-4 border-b border-gray-50">
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-sm font-semibold px-2.5 py-1 rounded-lg ${meta.badge}`}>
                    {meta.label}
                  </span>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">{fmt(users.length)} ผู้ใช้</p>
                    {row.price_monthly_thb > 0 && (
                      <p className="text-[11px] text-green-600">MRR ฿{fmt(planMRR)}</p>
                    )}
                  </div>
                </div>

                {/* Pricing display */}
                {row.price_monthly_thb > 0 ? (
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="text-2xl font-bold text-gray-900">฿{fmt(row.price_monthly_thb)}</span>
                    <span className="text-xs text-gray-400">/เดือน</span>
                    {row.price_yearly_thb > 0 && (
                      <span className="text-xs text-gray-400">· ฿{fmt(row.price_yearly_thb)}/ปี</span>
                    )}
                  </div>
                ) : (
                  <p className="text-sm font-semibold text-gray-700 mb-2">ฟรี</p>
                )}

                {/* Active/inactive badge */}
                {!row.is_active && (
                  <div className="flex items-center gap-1 text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded-lg w-fit">
                    <AlertCircle className="w-3 h-3" />
                    ปิดรับสมัครใหม่
                  </div>
                )}
              </div>

              {/* Limits */}
              <div className="px-5 py-3 border-b border-gray-50 space-y-1.5">
                <LimitRow label="ทรัพย์" value={row.max_stock === null ? 'ไม่จำกัด' : `${row.max_stock} รายการ`} />
                <LimitRow label="สัญญา" value={row.max_contracts_per_month === null ? 'ไม่จำกัด' : `${row.max_contracts_per_month}/เดือน`} />
                <LimitRow label="AI" value={`${row.ai_calls_per_month} ครั้ง/เดือน`} />
              </div>

              {/* Features */}
              {(row.feature_list ?? []).length > 0 && (
                <div className="px-5 py-3 border-b border-gray-50 space-y-1">
                  {row.feature_list.map((f, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-gray-600">
                      <Check className="w-3 h-3 text-green-500 mt-0.5 flex-shrink-0" />
                      {f}
                    </div>
                  ))}
                </div>
              )}

              {/* Editor */}
              <div className="px-5 py-4">
                <PlanEditor plan={plan} label={meta.label} badge={meta.badge} row={row} />
              </div>

              {/* Users on this plan */}
              <div className="border-t border-gray-50">
                <details className="group">
                  <summary className="flex items-center justify-between px-5 py-3 cursor-pointer hover:bg-gray-50 transition list-none select-none">
                    <span className="text-xs font-medium text-gray-600">
                      ผู้ใช้ ({fmt(users.length)} คน)
                    </span>
                    <span className="text-gray-400 text-xs group-open:rotate-180 transition-transform inline-block">▼</span>
                  </summary>
                  <div className="px-5 pb-4 space-y-2 max-h-72 overflow-y-auto">
                    {users.length === 0 ? (
                      <p className="text-xs text-gray-400 text-center py-2">ยังไม่มีผู้ใช้</p>
                    ) : users.map((u) => (
                      <div key={u.id} className="border border-gray-100 rounded-lg p-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-gray-800 truncate">
                              {u.name || u.nickname || u.email || u.id.slice(0, 8)}
                            </p>
                            <p className="text-[10px] text-gray-400 truncate">{u.email}</p>
                            <ExpiryBadge expiresAt={u.plan_expires_at} />
                          </div>
                          <UserPlanActions
                            userId={u.id}
                            currentPlan={resolvePlan(u.plan)}
                            currentExpiry={u.plan_expires_at}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </details>
              </div>
            </div>
          )
        })}
      </div>

      <p className="text-xs text-gray-400 text-center">
        การเปลี่ยนแปลงขีดจำกัดมีผลทันที — ช่อง &quot;ทรัพย์&quot; และ &quot;สัญญา&quot; ว่างหมายถึงไม่จำกัด
      </p>
    </div>
  )
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4">
      <div className="flex items-center gap-2 mb-1">{icon}<span className="text-xs text-gray-500">{label}</span></div>
      <p className="text-base font-bold text-gray-900">{value}</p>
    </div>
  )
}

function LimitRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-gray-800">{value}</span>
    </div>
  )
}
