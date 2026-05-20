import type { Metadata } from 'next'
import { BarChart3, Users, FileText, Home, TrendingUp, Zap, CreditCard } from 'lucide-react'
import { createAdminClient } from '@/lib/supabase/server'

export const metadata: Metadata = { title: 'Analytics — Admin' }
export const dynamic = 'force-dynamic'

// ── helpers ────────────────────────────────────────────────────

function fmt(n: number) { return new Intl.NumberFormat('th-TH').format(n) }

function last12Months(): string[] {
  const months: string[] = []
  const now = new Date()
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }
  return months
}

function monthLabel(ym: string) {
  const [y, m] = ym.split('-').map(Number)
  return new Date(y!, m! - 1, 1).toLocaleDateString('th-TH', { month: 'short' })
}

function groupByMonth(rows: { created_at: string }[]): Record<string, number> {
  const out: Record<string, number> = {}
  for (const row of rows) {
    const ym = row.created_at.slice(0, 7)
    out[ym] = (out[ym] ?? 0) + 1
  }
  return out
}

// ── Bar chart (CSS-only) ───────────────────────────────────────

function BarChart({
  months,
  data,
  color,
}: {
  months: string[]
  data: Record<string, number>
  color: string
}) {
  const values = months.map(m => data[m] ?? 0)
  const max = Math.max(...values, 1)
  const currentMonth = new Date().toISOString().slice(0, 7)

  return (
    <div className="flex items-end gap-1 h-24 mt-3">
      {months.map((m, i) => {
        const v = values[i] ?? 0
        const pct = Math.round((v / max) * 100)
        const isCurrent = m === currentMonth
        return (
          <div key={m} className="flex-1 flex flex-col items-center gap-1 group relative">
            <div
              className="w-full rounded-t-sm transition-all"
              style={{ height: `${Math.max(pct, v > 0 ? 4 : 0)}%`, backgroundColor: color, opacity: isCurrent ? 1 : 0.6 }}
            />
            {/* Tooltip */}
            <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition pointer-events-none z-10">
              {monthLabel(m)}: {v}
            </div>
            <span className="text-[9px] text-gray-400 leading-none">{monthLabel(m)}</span>
          </div>
        )
      })}
    </div>
  )
}

function ChartCard({
  title,
  icon,
  total,
  sub,
  months,
  data,
  color,
}: {
  title: string
  icon: React.ReactNode
  total: number
  sub: string
  months: string[]
  data: Record<string, number>
  color: string
}) {
  const currentMonth = new Date().toISOString().slice(0, 7)
  const thisMonth = data[currentMonth] ?? 0
  const prevMonth = months[months.length - 2]
  const lastMonth = prevMonth ? (data[prevMonth] ?? 0) : 0
  const delta = lastMonth > 0 ? Math.round(((thisMonth - lastMonth) / lastMonth) * 100) : null

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5">
      <div className="flex items-start justify-between mb-1">
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-sm font-medium text-gray-700">{title}</span>
        </div>
        {delta !== null && (
          <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded ${delta >= 0 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'}`}>
            {delta >= 0 ? '+' : ''}{delta}% MoM
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-gray-900">{fmt(total)}</p>
      <p className="text-xs text-gray-400">{sub} · เดือนนี้ {thisMonth}</p>
      <BarChart months={months} data={data} color={color} />
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────

export default async function AdminAnalyticsPage() {
  const admin = await createAdminClient()
  const months = last12Months()
  const since = months[0] + '-01'

  const [
    { count: totalUsers },
    { count: approvedUsers },
    { count: proUsers },
    { count: totalStock },
    { count: publishedStock },
    { count: totalContracts },
    { count: signedContracts },
    { data: newUsersRows },
    { data: newContractRows },
    { data: newStockRows },
    { data: paymentRows },
    { data: aiRows },
  ] = await Promise.all([
    admin.from('profiles').select('*', { count: 'exact', head: true }).neq('role', 'admin'),
    admin.from('profiles').select('*', { count: 'exact', head: true }).eq('account_status', 'approved').neq('role', 'admin'),
    admin.from('profiles').select('*', { count: 'exact', head: true }).in('plan', ['professional', 'business']),
    admin.from('stock').select('*', { count: 'exact', head: true }),
    admin.from('stock').select('*', { count: 'exact', head: true }).eq('is_published', true),
    admin.from('contracts').select('*', { count: 'exact', head: true }),
    admin.from('contracts').select('*', { count: 'exact', head: true }).in('status', ['signed', 'completed']),
    // Trend data — last 12 months
    admin.from('profiles').select('created_at').neq('role', 'admin').gte('created_at', since),
    admin.from('contracts').select('created_at').gte('created_at', since),
    admin.from('stock').select('created_at').gte('created_at', since),
    admin.from('payment_transactions').select('created_at, amount_thb').eq('status', 'successful').gte('created_at', since),
    admin.from('credit_transactions').select('created_at').eq('type', 'spend').gte('created_at', since),
  ])

  const usersByMonth      = groupByMonth(newUsersRows ?? [])
  const contractsByMonth  = groupByMonth(newContractRows ?? [])
  const stockByMonth      = groupByMonth(newStockRows ?? [])
  const aiByMonth         = groupByMonth(aiRows ?? [])

  // Revenue by month
  const revenueByMonth: Record<string, number> = {}
  for (const row of paymentRows ?? []) {
    const ym = row.created_at.slice(0, 7)
    revenueByMonth[ym] = (revenueByMonth[ym] ?? 0) + (row.amount_thb ?? 0)
  }
  const totalRevenue = Object.values(revenueByMonth).reduce((a, b) => a + b, 0)
  const currentMonth = new Date().toISOString().slice(0, 7)
  const mrr = revenueByMonth[currentMonth] ?? 0

  const userActivationRate   = totalUsers   ? Math.round((approvedUsers   ?? 0) / (totalUsers   ?? 1) * 100) : 0
  const publishRate          = totalStock   ? Math.round((publishedStock  ?? 0) / (totalStock   ?? 1) * 100) : 0
  const contractSignRate     = totalContracts ? Math.round((signedContracts ?? 0) / (totalContracts ?? 1) * 100) : 0
  const paidConversionRate   = approvedUsers  ? Math.round((proUsers       ?? 0) / (approvedUsers  ?? 1) * 100) : 0

  return (
    <div className="p-4 lg:p-8 pt-6 max-w-6xl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 bg-violet-50 rounded-xl flex items-center justify-center flex-shrink-0">
            <BarChart3 className="w-5 h-5 text-violet-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">Analytics</h1>
        </div>
        <p className="text-sm text-gray-400 ml-12">Platform metrics, conversion rates และ trends รายเดือน</p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'User Activation', value: `${userActivationRate}%`, sub: `${fmt(approvedUsers ?? 0)} / ${fmt(totalUsers ?? 0)}`, color: 'text-blue-600' },
          { label: 'Publish Rate',    value: `${publishRate}%`,         sub: `${fmt(publishedStock ?? 0)} / ${fmt(totalStock ?? 0)}`, color: 'text-green-600' },
          { label: 'Sign Rate',       value: `${contractSignRate}%`,    sub: `${fmt(signedContracts ?? 0)} / ${fmt(totalContracts ?? 0)}`, color: 'text-indigo-600' },
          { label: 'Paid Conversion', value: `${paidConversionRate}%`,  sub: `${fmt(proUsers ?? 0)} paid users`, color: 'text-purple-600' },
        ].map((m) => (
          <div key={m.label} className="bg-white rounded-xl border border-gray-100 p-4">
            <p className={`text-2xl font-bold ${m.color}`}>{m.value}</p>
            <p className="text-xs font-medium text-gray-600 mt-0.5">{m.label}</p>
            <p className="text-[11px] text-gray-400">{m.sub}</p>
          </div>
        ))}
      </div>

      {/* Revenue summary */}
      <div className="bg-gradient-to-r from-violet-50 to-purple-50 border border-violet-100 rounded-xl px-5 py-4 mb-6 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <CreditCard className="w-5 h-5 text-violet-600" />
          <div>
            <p className="text-xs text-violet-500">รายได้สะสม (ที่บันทึก)</p>
            <p className="text-xl font-bold text-violet-900">฿{fmt(totalRevenue)}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-violet-500">MRR เดือนนี้</p>
          <p className="text-lg font-bold text-violet-800">฿{fmt(mrr)}</p>
        </div>
      </div>

      {/* Trend charts */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-2 gap-4 mb-6">
        <ChartCard
          title="ผู้ใช้ใหม่"
          icon={<Users className="w-4 h-4 text-blue-500" />}
          total={totalUsers ?? 0}
          sub="ทั้งหมด"
          months={months}
          data={usersByMonth}
          color="#3b82f6"
        />
        <ChartCard
          title="สัญญาใหม่"
          icon={<FileText className="w-4 h-4 text-indigo-500" />}
          total={totalContracts ?? 0}
          sub="ทั้งหมด"
          months={months}
          data={contractsByMonth}
          color="#6366f1"
        />
        <ChartCard
          title="ทรัพย์ใหม่"
          icon={<Home className="w-4 h-4 text-green-500" />}
          total={totalStock ?? 0}
          sub="ทั้งหมด"
          months={months}
          data={stockByMonth}
          color="#22c55e"
        />
        <ChartCard
          title="AI ใช้งาน"
          icon={<Zap className="w-4 h-4 text-orange-500" />}
          total={(aiRows ?? []).length}
          sub="ครั้งที่บันทึก"
          months={months}
          data={aiByMonth}
          color="#f97316"
        />
      </div>

      {/* Revenue chart */}
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-violet-500" />
            <span className="text-sm font-medium text-gray-700">รายได้รายเดือน (THB)</span>
          </div>
        </div>
        <p className="text-2xl font-bold text-gray-900">฿{fmt(totalRevenue)}</p>
        <p className="text-xs text-gray-400">จาก payment_transactions ที่บันทึก · เดือนนี้ ฿{fmt(mrr)}</p>
        <div className="flex items-end gap-1 h-24 mt-3">
          {months.map((m) => {
            const v = revenueByMonth[m] ?? 0
            const maxV = Math.max(...months.map(x => revenueByMonth[x] ?? 0), 1)
            const pct = Math.round((v / maxV) * 100)
            const isCurrent = m === currentMonth
            return (
              <div key={m} className="flex-1 flex flex-col items-center gap-1 group relative">
                <div
                  className="w-full rounded-t-sm"
                  style={{ height: `${Math.max(pct, v > 0 ? 4 : 0)}%`, backgroundColor: '#8b5cf6', opacity: isCurrent ? 1 : 0.55 }}
                />
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition pointer-events-none z-10">
                  {monthLabel(m)}: ฿{fmt(v)}
                </div>
                <span className="text-[9px] text-gray-400 leading-none">{monthLabel(m)}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
