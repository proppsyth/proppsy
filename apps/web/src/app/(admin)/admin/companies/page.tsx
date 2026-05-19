import type { Metadata } from 'next'
import Link from 'next/link'
import { Building2, Users } from 'lucide-react'
import { createAdminClient } from '@/lib/supabase/server'
import { PLAN_META, resolvePlan } from '@/types'
import type { Plan } from '@/types'

export const metadata: Metadata = { title: 'บริษัท / ทีม — Admin' }

interface ProfileRow {
  id: string
  first_name_th: string | null
  last_name_th: string | null
  nickname: string | null
  company_name: string | null
  team_name: string | null
  plan: string | null
  account_status: string | null
}

interface CompanyGroup {
  name: string
  agents: ProfileRow[]
  planCounts: Record<Plan, number>
}

export default async function AdminCompaniesPage() {
  const admin = await createAdminClient()

  const { data: profiles } = await admin
    .from('profiles')
    .select('id, first_name_th, last_name_th, nickname, company_name, team_name, plan, account_status')
    .neq('role', 'admin')
    .order('company_name', { ascending: true })

  const rows = (profiles ?? []) as ProfileRow[]

  // Group by company_name server-side
  const companyMap = new Map<string, CompanyGroup>()
  const soloAgents: ProfileRow[] = []

  for (const p of rows) {
    if (!p.company_name?.trim()) {
      soloAgents.push(p)
      continue
    }
    const key = p.company_name.trim()
    if (!companyMap.has(key)) {
      companyMap.set(key, { name: key, agents: [], planCounts: { starter: 0, professional: 0, business: 0 } })
    }
    const group = companyMap.get(key)!
    group.agents.push(p)
    const plan = resolvePlan(p.plan)
    group.planCounts[plan]++
  }

  // Sort companies by agent count descending
  const companies = Array.from(companyMap.values()).sort((a, b) => b.agents.length - a.agents.length)

  const totalCompanies = companies.length
  const totalAgents = rows.length

  const PLANS: Plan[] = ['starter', 'professional', 'business']

  return (
    <div className="p-4 lg:p-8 pt-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
            <Building2 className="w-5 h-5 text-blue-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">บริษัท / ทีม</h1>
        </div>
        <p className="text-sm text-gray-400 ml-12">จัดกลุ่มเอเจนต์ตาม company_name</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: 'บริษัท/ทีมทั้งหมด', value: totalCompanies },
          { label: 'เอเจนต์เดี่ยว', value: soloAgents.length },
          { label: 'เอเจนต์ทั้งหมด', value: totalAgents },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-100 p-4">
            <p className="text-2xl font-bold text-gray-900">{s.value.toLocaleString()}</p>
            <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Company list */}
      {companies.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-8 text-center text-gray-400 text-sm mb-4">
          ยังไม่มีบริษัท/ทีมในระบบ
        </div>
      ) : (
        <div className="space-y-3 mb-6">
          {companies.map((company) => (
            <div key={company.name} className="bg-white rounded-xl border border-gray-100 p-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Building2 className="w-4 h-4 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <p className="font-semibold text-gray-900 truncate">{company.name}</p>
                    <Link
                      href={`/admin/users?q=${encodeURIComponent(company.name)}`}
                      className="text-xs text-blue-600 hover:underline flex-shrink-0"
                    >
                      ดูผู้ใช้
                    </Link>
                  </div>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <span className="flex items-center gap-1 text-xs text-gray-500">
                      <Users className="w-3.5 h-3.5" />
                      {company.agents.length} เอเจนต์
                    </span>
                    {PLANS.map((plan) =>
                      company.planCounts[plan] > 0 ? (
                        <span
                          key={plan}
                          className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${PLAN_META[plan].badge}`}
                        >
                          {PLAN_META[plan].label} ×{company.planCounts[plan]}
                        </span>
                      ) : null
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Solo agents */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900 text-sm">เอเจนต์เดี่ยว (ไม่มีบริษัท)</h2>
          <span className="text-xs text-gray-400">{soloAgents.length} คน</span>
        </div>
        {soloAgents.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">ไม่มีเอเจนต์เดี่ยว</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {soloAgents.slice(0, 50).map((p) => {
              const displayName =
                p.nickname ||
                [p.first_name_th, p.last_name_th].filter(Boolean).join(' ') ||
                p.id.slice(0, 8)
              const plan = resolvePlan(p.plan)
              return (
                <div key={p.id} className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-sm text-gray-700 truncate">{displayName}</span>
                  <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${PLAN_META[plan].badge}`}>
                    {PLAN_META[plan].label}
                  </span>
                </div>
              )
            })}
            {soloAgents.length > 50 && (
              <div className="px-4 py-3 text-xs text-gray-400 text-center">
                และอีก {soloAgents.length - 50} คน
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
