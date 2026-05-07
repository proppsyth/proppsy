import { redirect } from 'next/navigation'
import Link from 'next/link'
import { TrendingUp, ArrowRight } from 'lucide-react'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = { title: 'คอมมิชชัน' }

function fmt(n: number) {
  return new Intl.NumberFormat('th-TH').format(Math.round(n))
}

function monthLabel(ym: string) {
  const [y, m] = ym.split('-').map(Number)
  return new Date(y!, m! - 1, 1).toLocaleDateString('th-TH', { year: 'numeric', month: 'long' })
}

type MonthEntry = { ym: string; total: number; count: number }

export default async function CommissionPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: contracts } = await supabase
    .from('contracts')
    .select('id, commission_net, created_at, doc_type')
    .eq('agent_uid', user.id)
    .eq('status', 'signed')
    .not('commission_net', 'is', null)
    .order('created_at', { ascending: false })

  // Group by year-month
  const byMonth = new Map<string, MonthEntry>()
  let grandTotal = 0
  for (const c of contracts ?? []) {
    if (!c.commission_net) continue
    const ym = c.created_at.slice(0, 7) // "YYYY-MM"
    const entry = byMonth.get(ym) ?? { ym, total: 0, count: 0 }
    entry.total += c.commission_net
    entry.count += 1
    byMonth.set(ym, entry)
    grandTotal += c.commission_net
  }

  const months = [...byMonth.values()].sort((a, b) => b.ym.localeCompare(a.ym))
  const maxTotal = months.reduce((m, e) => Math.max(m, e.total), 0) || 1

  // This month
  const thisYm = new Date().toISOString().slice(0, 7)
  const thisMonth = byMonth.get(thisYm)
  const lastYm = months.find(m => m.ym !== thisYm)

  return (
    <div className="p-4 lg:p-8 pt-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
          <TrendingUp className="w-5 h-5 text-emerald-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">คอมมิชชัน</h1>
          <p className="text-xs text-gray-400">รายได้จากสัญญาที่ลงนามแล้ว</p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <p className="text-xs text-gray-400 mb-1">รวมทั้งหมด</p>
          <p className="text-2xl font-bold text-gray-900">฿{fmt(grandTotal)}</p>
          <p className="text-xs text-gray-400 mt-0.5">{contracts?.length ?? 0} สัญญา</p>
        </div>
        <div className="bg-emerald-50 rounded-xl border border-emerald-100 shadow-sm p-4">
          <p className="text-xs text-emerald-600 mb-1">เดือนนี้</p>
          <p className="text-2xl font-bold text-emerald-700">฿{fmt(thisMonth?.total ?? 0)}</p>
          <p className="text-xs text-emerald-500 mt-0.5">{thisMonth?.count ?? 0} สัญญา</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <p className="text-xs text-gray-400 mb-1">เดือนก่อน</p>
          <p className="text-2xl font-bold text-gray-700">฿{fmt(lastYm?.total ?? 0)}</p>
          <p className="text-xs text-gray-400 mt-0.5">{lastYm?.count ?? 0} สัญญา</p>
        </div>
      </div>

      {/* Bar chart */}
      {months.length > 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden mb-6">
          <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/70">
            <h2 className="text-sm font-semibold text-gray-700">รายได้รายเดือน</h2>
          </div>
          <div className="p-5 space-y-3">
            {months.map(entry => (
              <div key={entry.ym} className="flex items-center gap-3">
                <span className="text-xs text-gray-500 w-32 flex-shrink-0">{monthLabel(entry.ym)}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-6 relative overflow-hidden">
                  <div
                    className="absolute left-0 top-0 h-full bg-emerald-500 rounded-full transition-all duration-500"
                    style={{ width: `${(entry.total / maxTotal) * 100}%` }}
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-600">
                    ฿{fmt(entry.total)}
                  </span>
                </div>
                <span className="text-xs text-gray-400 w-12 text-right flex-shrink-0">
                  {entry.count} รายการ
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-16 text-gray-400">
          <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-25" />
          <p className="text-sm">ยังไม่มีข้อมูลคอมมิชชัน</p>
          <p className="text-xs mt-1">ข้อมูลจะแสดงเมื่อสัญญามีสถานะ "ลงนามแล้ว"</p>
        </div>
      )}

      {/* Contract list */}
      {(contracts?.length ?? 0) > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/70 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700">รายการสัญญา</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {contracts!.map(c => (
              <Link
                key={c.id}
                href={`/contracts/${c.id}`}
                className="flex items-center justify-between p-4 hover:bg-gray-50 transition"
              >
                <div>
                  <p className="text-sm font-medium text-gray-800">{c.id}</p>
                  <p className="text-xs text-gray-400">
                    {new Date(c.created_at).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <p className="text-sm font-semibold text-emerald-700">฿{fmt(c.commission_net!)}</p>
                  <ArrowRight className="w-4 h-4 text-gray-300" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
