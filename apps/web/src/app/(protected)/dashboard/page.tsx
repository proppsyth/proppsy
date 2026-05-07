import Link from 'next/link'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = { title: 'แดชบอร์ด' }

function fmt(n: number) {
  return new Intl.NumberFormat('th-TH').format(Math.round(n))
}

const DOC_LABELS: Record<string, string> = {
  rental: 'สัญญาเช่า', reservation: 'สัญญาจอง', renewal: 'ต่อสัญญา',
  cancellation: 'ยกเลิก', termination: 'บอกเลิก', notice: 'หนังสือแจ้ง',
  receipt_book: 'ใบเสร็จ', receipt_rent: 'ใบเสร็จค่าเช่า', commission: 'คอมมิชชัน',
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'ร่าง', sent: 'ส่งแล้ว', signed: 'ลงนามแล้ว', cancelled: 'ยกเลิก',
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  sent: 'bg-yellow-100 text-yellow-700',
  signed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-600',
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const now = new Date()
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-CA')
  const todayStr = now.toLocaleDateString('en-CA')

  const [
    { count: totalStock },
    { count: availableStock },
    { count: rentedStock },
    { count: soldStock },
    { count: totalOwners },
    { count: totalCustomers },
    { count: totalContracts },
    { data: recentContracts },
    { data: upcomingAppointments },
    { data: expiringContracts },
    { data: commissionThisMonth },
  ] = await Promise.all([
    supabase.from('stock').select('*', { count: 'exact', head: true }).eq('agent_uid', user.id),
    supabase.from('stock').select('*', { count: 'exact', head: true }).eq('agent_uid', user.id).eq('status', 'available'),
    supabase.from('stock').select('*', { count: 'exact', head: true }).eq('agent_uid', user.id).eq('status', 'rented'),
    supabase.from('stock').select('*', { count: 'exact', head: true }).eq('agent_uid', user.id).eq('status', 'sold'),
    supabase.from('owners').select('*', { count: 'exact', head: true }).eq('agent_uid', user.id),
    supabase.from('customers').select('*', { count: 'exact', head: true }).eq('agent_uid', user.id),
    supabase.from('contracts').select('*', { count: 'exact', head: true }).eq('agent_uid', user.id),
    supabase.from('contracts')
      .select('id, doc_type, status, created_at')
      .eq('agent_uid', user.id).order('created_at', { ascending: false }).limit(5),
    supabase.from('appointments')
      .select('id, title, start_time')
      .eq('agent_uid', user.id).gte('start_time', now.toISOString())
      .order('start_time').limit(5),
    supabase.from('contracts')
      .select('id, end_date, doc_type')
      .eq('agent_uid', user.id)
      .gte('end_date', todayStr)
      .lte('end_date', in30Days)
      .neq('status', 'cancelled')
      .order('end_date'),
    supabase.from('contracts')
      .select('commission_net')
      .eq('agent_uid', user.id)
      .eq('status', 'signed')
      .gte('created_at', thisMonthStart)
      .not('commission_net', 'is', null),
  ])

  const commissionSum = (commissionThisMonth ?? []).reduce((s, c) => s + (c.commission_net ?? 0), 0)

  return (
    <div className="p-4 lg:p-8 pt-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">แดชบอร์ด</h1>
        <p className="text-gray-500 text-sm mt-0.5">ภาพรวมของคุณ</p>
      </div>

      {/* KPI row 1: main counts */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <KpiCard color="blue" label="ทรัพย์ทั้งหมด" value={totalStock ?? 0}
          sub={<>ว่าง {availableStock ?? 0} · เช่า {rentedStock ?? 0} · ขาย {soldStock ?? 0}</>}
          href="/stock" />
        <KpiCard color="orange" label="เจ้าของทรัพย์" value={totalOwners ?? 0} href="/owners" />
        <KpiCard color="violet" label="ลูกค้า" value={totalCustomers ?? 0} href="/customers" />
        <KpiCard color="slate" label="สัญญาทั้งหมด" value={totalContracts ?? 0} href="/contracts" />
      </div>

      {/* KPI row 2: alerts */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        <KpiCard color="green" label="คอมมิชชันเดือนนี้" value={`฿${fmt(commissionSum)}`}
          sub={`${commissionThisMonth?.length ?? 0} สัญญา`} href="/commission" />
        <KpiCard color="yellow" label="สัญญาหมดภายใน 30 วัน" value={expiringContracts?.length ?? 0}
          sub="รายการ" href="/contracts" />
        <KpiCard color="cyan" label="นัดหมายที่กำลังจะมา" value={upcomingAppointments?.length ?? 0}
          href="/appointments" />
        <KpiCard color="rose" label="นัดวันนี้"
          value={upcomingAppointments?.filter(a => new Date(a.start_time).toLocaleDateString('en-CA') === todayStr).length ?? 0}
          href="/calendar" />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Recent contracts */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-800">สัญญาล่าสุด</h2>
            <Link href="/contracts" className="text-xs text-blue-600 hover:underline">ดูทั้งหมด →</Link>
          </div>
          <div className="divide-y divide-gray-50">
            {!recentContracts?.length ? (
              <p className="p-6 text-center text-sm text-gray-400">ยังไม่มีสัญญา</p>
            ) : recentContracts.map(c => (
              <Link key={c.id} href={`/contracts/${c.id}`}
                className="flex items-center justify-between p-4 hover:bg-gray-50 transition">
                <div>
                  <p className="text-sm font-medium text-gray-800">{c.id}</p>
                  <p className="text-xs text-gray-400">{DOC_LABELS[c.doc_type] ?? c.doc_type}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[c.status] ?? 'bg-gray-100 text-gray-600'}`}>
                  {STATUS_LABELS[c.status] ?? c.status}
                </span>
              </Link>
            ))}
          </div>
        </div>

        {/* Right column: appointments + expiring */}
        <div className="space-y-4">
          {/* Upcoming appointments */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-semibold text-gray-800">นัดหมายที่กำลังจะมาถึง</h2>
              <Link href="/appointments" className="text-xs text-blue-600 hover:underline">ดูทั้งหมด →</Link>
            </div>
            <div className="divide-y divide-gray-50">
              {!upcomingAppointments?.length ? (
                <p className="p-4 text-center text-sm text-gray-400">ไม่มีนัดหมาย</p>
              ) : upcomingAppointments.map(apt => {
                const d = new Date(apt.start_time)
                return (
                  <div key={apt.id} className="p-3 flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-50 rounded-lg flex flex-col items-center justify-center flex-shrink-0">
                      <span className="text-xs font-bold text-blue-700">{d.getDate()}</span>
                      <span className="text-[10px] text-blue-400">{d.toLocaleDateString('th-TH', { month: 'short' })}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{apt.title}</p>
                      <p className="text-xs text-gray-400">
                        {d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Expiring contracts */}
          {(expiringContracts?.length ?? 0) > 0 && (
            <div className="bg-orange-50 rounded-xl border border-orange-100">
              <div className="p-4 border-b border-orange-100 flex items-center justify-between">
                <h2 className="font-semibold text-orange-800 text-sm">⚠️ สัญญาใกล้หมดอายุ (30 วัน)</h2>
                <Link href="/contracts" className="text-xs text-orange-600 hover:underline">ดูทั้งหมด →</Link>
              </div>
              <div className="divide-y divide-orange-100">
                {expiringContracts!.map(c => (
                  <Link key={c.id} href={`/contracts/${c.id}`}
                    className="flex items-center justify-between p-3 hover:bg-orange-100/50 transition">
                    <p className="text-sm text-orange-800 font-medium">{c.id}</p>
                    <p className="text-xs text-orange-600">
                      {c.end_date ? new Date(c.end_date + 'T00:00:00').toLocaleDateString('th-TH', { day: 'numeric', month: 'short' }) : ''}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const COLOR_MAP: Record<string, { card: string; value: string; sub: string }> = {
  blue:   { card: 'bg-blue-50 border-blue-100',   value: 'text-blue-700',   sub: 'text-blue-500' },
  orange: { card: 'bg-orange-50 border-orange-100', value: 'text-orange-700', sub: 'text-orange-500' },
  violet: { card: 'bg-violet-50 border-violet-100', value: 'text-violet-700', sub: 'text-violet-500' },
  slate:  { card: 'bg-slate-50 border-slate-100',  value: 'text-slate-700',  sub: 'text-slate-500' },
  green:  { card: 'bg-green-50 border-green-100',  value: 'text-green-700',  sub: 'text-green-500' },
  yellow: { card: 'bg-yellow-50 border-yellow-100', value: 'text-yellow-700', sub: 'text-yellow-600' },
  cyan:   { card: 'bg-cyan-50 border-cyan-100',    value: 'text-cyan-700',   sub: 'text-cyan-500' },
  rose:   { card: 'bg-rose-50 border-rose-100',    value: 'text-rose-700',   sub: 'text-rose-500' },
}

function KpiCard({
  color,
  label,
  value,
  sub,
  href,
}: {
  color: string
  label: string
  value: string | number
  sub?: React.ReactNode
  href: string
}) {
  const c = COLOR_MAP[color] ?? COLOR_MAP.slate!
  return (
    <Link href={href} className={`block rounded-xl p-4 border shadow-sm hover:shadow-md transition-shadow ${c.card}`}>
      <p className={`text-2xl font-bold ${c.value}`}>{value}</p>
      <p className="text-xs font-medium text-gray-600 mt-0.5">{label}</p>
      {sub && <p className={`text-xs mt-0.5 ${c.sub}`}>{sub}</p>}
    </Link>
  )
}
