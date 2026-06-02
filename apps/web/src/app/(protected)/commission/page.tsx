import { redirect } from 'next/navigation'
import Link from 'next/link'
import { TrendingUp, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react'
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

export default async function CommissionPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const currentYear = new Date().getFullYear()
  const { year: yearStr } = await searchParams
  const selectedYear = yearStr ? parseInt(yearStr) : currentYear

  const { data: contracts } = await supabase
    .from('contracts')
    .select('id, commission_net, created_at, move_in_date, doc_type')
    .eq('agent_uid', user.id)
    .eq('status', 'signed')
    .not('commission_net', 'is', null)
    .order('move_in_date', { ascending: false, nullsFirst: false })

  // Commission date = move_in_date (lease signing date), fallback to created_at
  function commissionDate(c: { created_at: string; move_in_date?: string | null }): string {
    return c.move_in_date ?? c.created_at
  }

  // All years available
  const allYears = [...new Set((contracts ?? []).map(c => parseInt(commissionDate(c).slice(0, 4))))].sort((a, b) => b - a)
  if (allYears.length === 0) allYears.push(currentYear)

  // Filter by selected year
  const filtered = (contracts ?? []).filter(c => parseInt(commissionDate(c).slice(0, 4)) === selectedYear)

  // Group by year-month using commission date (move-in = signing = commission received)
  const byMonth = new Map<string, MonthEntry>()
  let grandTotal = 0
  let grandAllTotal = 0
  for (const c of contracts ?? []) {
    if (!c.commission_net) continue
    grandAllTotal += c.commission_net
  }
  for (const c of filtered) {
    if (!c.commission_net) continue
    const ym = commissionDate(c).slice(0, 7)
    const entry = byMonth.get(ym) ?? { ym, total: 0, count: 0 }
    entry.total += c.commission_net
    entry.count += 1
    byMonth.set(ym, entry)
    grandTotal += c.commission_net
  }

  const months = [...byMonth.values()].sort((a, b) => a.ym.localeCompare(b.ym))
  const maxTotal = months.reduce((m, e) => Math.max(m, e.total), 0) || 1

  const thisYm = new Date().toISOString().slice(0, 7)
  const thisMonth = byMonth.get(thisYm)
  const prevYm = months.length > 1 ? months[months.length - 2] : undefined

  const prevYear = selectedYear - 1
  const nextYear = selectedYear + 1
  const hasNext = nextYear <= currentYear

  return (
    <div className="p-4 lg:p-8 pt-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
          <TrendingUp className="w-5 h-5 text-emerald-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">คอมมิชชัน</h1>
          <p className="text-xs text-gray-400">รายได้จากสัญญาที่ลงนามแล้ว · วันรับค่าคอม = วันลงนามสัญญาเช่า</p>
        </div>
      </div>

      {/* Year Selector */}
      <div className="flex items-center justify-between bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3 mb-6">
        <Link
          href={`/commission?year=${prevYear}`}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition text-gray-500"
        >
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <div className="text-center">
          <p className="text-lg font-bold text-gray-900">
            {new Date(selectedYear, 0, 1).toLocaleDateString('th-TH', { year: 'numeric' })}
          </p>
          {selectedYear === currentYear && <p className="text-xs text-emerald-600">ปีปัจจุบัน</p>}
        </div>
        <Link
          href={hasNext ? `/commission?year=${nextYear}` : '#'}
          className={`w-8 h-8 flex items-center justify-center rounded-full transition ${hasNext ? 'hover:bg-gray-100 text-gray-500' : 'text-gray-200 cursor-default'}`}
        >
          <ChevronRight className="w-5 h-5" />
        </Link>
      </div>

      {/* Year selector pills (all available years) */}
      {allYears.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1 mb-6 scrollbar-none">
          {allYears.map(y => (
            <Link
              key={y}
              href={`/commission?year=${y}`}
              className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition flex-shrink-0 ${
                y === selectedYear ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {new Date(y, 0, 1).toLocaleDateString('th-TH', { year: 'numeric' })}
            </Link>
          ))}
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
        <div className="bg-emerald-50 rounded-xl border border-emerald-100 shadow-sm p-4">
          <p className="text-xs text-emerald-600 mb-1">รวมปีนี้</p>
          <p className="text-2xl font-bold text-emerald-700">฿{fmt(grandTotal)}</p>
          <p className="text-xs text-emerald-500 mt-0.5">{filtered.length} สัญญา</p>
        </div>
        {selectedYear === currentYear && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <p className="text-xs text-gray-400 mb-1">เดือนนี้</p>
            <p className="text-2xl font-bold text-gray-900">฿{fmt(thisMonth?.total ?? 0)}</p>
            <p className="text-xs text-gray-400 mt-0.5">{thisMonth?.count ?? 0} สัญญา</p>
          </div>
        )}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <p className="text-xs text-gray-400 mb-1">รวมทุกปี</p>
          <p className="text-2xl font-bold text-gray-700">฿{fmt(grandAllTotal)}</p>
          <p className="text-xs text-gray-400 mt-0.5">{contracts?.length ?? 0} สัญญา</p>
        </div>
        {prevYm && selectedYear === currentYear && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <p className="text-xs text-gray-400 mb-1">เดือนก่อน</p>
            <p className="text-2xl font-bold text-gray-700">฿{fmt(prevYm.total)}</p>
            <p className="text-xs text-gray-400 mt-0.5">{prevYm.count} สัญญา</p>
          </div>
        )}
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
          <p className="text-sm">ไม่มีข้อมูลคอมมิชชันในปีนี้</p>
          <p className="text-xs mt-1">ข้อมูลจะแสดงเมื่อสัญญามีสถานะ "ลงนามแล้ว"</p>
        </div>
      )}

      {/* Contract list */}
      {filtered.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/70">
            <h2 className="text-sm font-semibold text-gray-700">รายการสัญญา</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {filtered.map(c => (
              <Link
                key={c.id}
                href={`/contracts/${c.id}`}
                className="flex items-center justify-between p-4 hover:bg-gray-50 transition"
              >
                <div>
                  <p className="text-sm font-medium text-gray-800">{c.id}</p>
                  <p className="text-xs text-gray-400">
                    {new Date(commissionDate(c)).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}
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
