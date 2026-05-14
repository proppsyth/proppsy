import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Zap } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getCreditBalance, getTransactions } from '@/lib/credits/actions'
import { resolvePlan, PLAN_META } from '@/types'
import CreditGauge from '@/components/credits/CreditGauge'
import TransactionHistory from '@/components/credits/TransactionHistory'
import HotBadge from '@/components/credits/HotBadge'

// Plan quota caps for the gauge
const PLAN_QUOTA: Record<string, number | null> = {
  starter:      3,
  professional: 100,
  business:     null,
}

export default async function CreditsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: profile }, balanceData, { transactions }] = await Promise.all([
    supabase.from('profiles').select('plan, plan_expires_at').eq('id', user.id).single(),
    getCreditBalance(),
    getTransactions(50),
  ])

  const plan = resolvePlan(profile?.plan)
  const planMeta = PLAN_META[plan]
  const quota = PLAN_QUOTA[plan] ?? Math.max(balanceData.totalEarned, balanceData.balance, 10)
  const nextReset = profile?.plan_expires_at
    ? new Date(profile.plan_expires_at).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })
    : null

  return (
    <div className="max-w-2xl mx-auto px-4 pt-4 pb-28 lg:pb-8 space-y-5">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">เครดิตของฉัน</h1>
        <div className="flex items-center gap-2 mt-1">
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${planMeta.badge}`}>
            {planMeta.label}
          </span>
          {nextReset && plan !== 'starter' && (
            <span className="text-xs text-gray-400">รีเซ็ตถัดไป: {nextReset}</span>
          )}
        </div>
      </div>

      {/* Balance card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center gap-6">
          <CreditGauge
            balance={balanceData.balance}
            total={quota}
          />

          <div className="flex-1 space-y-3 min-w-0">
            <div>
              <p className="text-xs text-gray-500">เครดิตคงเหลือ</p>
              <p className="text-4xl font-bold text-gray-900 tabular-nums leading-none mt-0.5">
                {balanceData.balance}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="bg-green-50 rounded-xl px-3 py-2">
                <p className="text-[11px] text-gray-500">รับทั้งหมด</p>
                <p className="text-sm font-bold text-green-600 tabular-nums">
                  +{balanceData.totalEarned}
                </p>
              </div>
              <div className="bg-red-50 rounded-xl px-3 py-2">
                <p className="text-[11px] text-gray-500">ใช้ไปทั้งหมด</p>
                <p className="text-sm font-bold text-red-500 tabular-nums">
                  -{balanceData.totalSpent}
                </p>
              </div>
            </div>

            {balanceData.lastResetDate && (
              <p className="text-xs text-gray-400">
                รีเซ็ตล่าสุด:{' '}
                {new Date(balanceData.lastResetDate).toLocaleDateString('th-TH', {
                  year: 'numeric', month: 'long', day: 'numeric',
                })}
              </p>
            )}
          </div>
        </div>

        {/* Top-up CTA */}
        <div className="mt-5 pt-4 border-t border-gray-100">
          <Link
            href="/credits/topup"
            className="flex items-center justify-center gap-2 w-full py-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-semibold rounded-xl transition"
          >
            <Zap className="w-4 h-4" />
            เติมเครดิต
          </Link>
        </div>
      </div>

      {/* Credit cost reference */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <p className="text-[11px] text-gray-400 font-medium uppercase tracking-wide">
            Standard Listing
          </p>
          <p className="text-2xl font-bold text-gray-900 mt-1">1 <span className="text-sm font-normal text-gray-500">เครดิต</span></p>
          <p className="text-xs text-gray-400 mt-0.5">≈ 20 บาท</p>
        </div>
        <div className="bg-white rounded-2xl border border-orange-200 shadow-sm p-4">
          <div className="flex items-center gap-1.5">
            <p className="text-[11px] text-gray-400 font-medium uppercase tracking-wide">Premium</p>
            <HotBadge />
          </div>
          <p className="text-2xl font-bold text-orange-600 mt-1">3 <span className="text-sm font-normal text-gray-500">เครดิต</span></p>
          <p className="text-xs text-gray-400 mt-0.5">≈ 60 บาท · 30 วัน</p>
        </div>
      </div>

      {/* Transaction history */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50">
          <h2 className="text-sm font-semibold text-gray-700">ประวัติการทำรายการ</h2>
        </div>
        <TransactionHistory transactions={transactions} />
      </div>
    </div>
  )
}
