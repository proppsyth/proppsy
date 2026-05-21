import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import ProfileForm from './ProfileForm'
import { resolvePlan, PLAN_META } from '@/types'
import { getPlanLimitsByUserPlan } from '@/lib/planLimits'

export const metadata: Metadata = { title: 'โปรไฟล์ของฉัน' }

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  const profileWithEmail = { ...profile, email: profile.email ?? user.email }
  const plan = resolvePlan(profile.plan)
  const planMeta = PLAN_META[plan]
  const limits = await getPlanLimitsByUserPlan(profile.plan)

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  const [{ count: stockCount }, { count: contractsThisMonth }] = await Promise.all([
    supabase.from('stock').select('*', { count: 'exact', head: true }).eq('agent_uid', user.id),
    supabase.from('contracts').select('*', { count: 'exact', head: true }).eq('agent_uid', user.id).gte('created_at', startOfMonth),
  ])

  const planExpired = profile.plan_expires_at && new Date(profile.plan_expires_at) < now
  const aiLimit = (planExpired && plan !== 'starter') ? 0 : limits.aiCallsPerMonth
  const aiUsed = (profile.ai_calls_month ?? '').startsWith(currentMonthStr)
    ? (profile.ai_calls_this_month ?? 0)
    : 0

  return (
    <div className="p-4 lg:p-8 pt-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">โปรไฟล์ของฉัน</h1>
        <p className="text-gray-500 text-sm mt-0.5">ข้อมูลส่วนตัวและการตั้งค่าบัญชี</p>
      </div>

      {/* Plan Card */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs text-gray-400 mb-0.5">แพ็กเกจปัจจุบัน</p>
            <div className="flex items-center gap-2">
              <span className={`text-sm font-bold px-2.5 py-0.5 rounded-full ${planMeta.badge}`}>
                {planMeta.label}
              </span>
              {plan === 'starter' && (
                <Link href="/services" className="text-xs text-blue-600 hover:underline">
                  อัปเกรด →
                </Link>
              )}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="bg-gray-50 rounded-xl p-3 text-center">
            <p className="text-lg font-bold text-gray-900">{stockCount ?? 0}</p>
            <p className="text-xs text-gray-500">
              ทรัพย์ {limits.maxStock !== null ? `/ ${limits.maxStock}` : '/ ไม่จำกัด'}
            </p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3 text-center">
            <p className="text-lg font-bold text-gray-900">{contractsThisMonth ?? 0}</p>
            <p className="text-xs text-gray-500">
              สัญญาเดือนนี้ {limits.maxContractsPerMonth !== null ? `/ ${limits.maxContractsPerMonth}` : '/ ไม่จำกัด'}
            </p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3 text-center">
            <p className={`text-lg font-bold ${aiUsed >= aiLimit ? 'text-red-500' : 'text-gray-900'}`}>
              {aiUsed}/{aiLimit}
            </p>
            <p className="text-xs text-gray-500">AI เดือนนี้</p>
            <div className="mt-1.5 h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${aiUsed >= aiLimit ? 'bg-red-400' : aiUsed / aiLimit >= 0.7 ? 'bg-amber-400' : 'bg-emerald-400'}`}
                style={{ width: `${aiLimit > 0 ? Math.min((aiUsed / aiLimit) * 100, 100) : 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <ProfileForm profile={profileWithEmail} />
    </div>
  )
}
