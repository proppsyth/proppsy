import Link from 'next/link'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { BannerStrip } from '@/components/shared/BannerZone'
import PendingApprovalBanner from '@/components/shared/PendingApprovalBanner'
import { PLAN_META, resolvePlan } from '@/types'

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

const SOURCE_LABELS: Record<string, string> = {
  line_oa: 'LINE OA',
  referral: 'แนะนำ / Referral',
  walk_in: 'Walk-in',
  online: 'ออนไลน์',
  facebook: 'Facebook',
  direct: 'โดยตรง',
  website: 'เว็บไซต์',
  public_listing: 'รายการทรัพย์',
  other: 'อื่นๆ',
}

const SOURCE_COLORS: Record<string, string> = {
  line_oa: 'bg-green-500',
  referral: 'bg-blue-500',
  walk_in: 'bg-violet-500',
  online: 'bg-cyan-500',
  facebook: 'bg-indigo-500',
  direct: 'bg-slate-400',
  website: 'bg-orange-400',
  public_listing: 'bg-emerald-500',
  other: 'bg-gray-400',
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const now = new Date()
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const todayStr = now.toLocaleDateString('en-CA')
  const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-CA')

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
    // CRM analytics queries
    { data: customersLast30 },
    { data: allCustomerSources },
    { data: convertedContractCustomers },
    { count: upcomingApptCount },
    { count: publishedStockCount },
    { data: recentInquiries },
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
    // CRM: trend data (last 30 days)
    supabase.from('customers')
      .select('created_at, source')
      .eq('agent_uid', user.id)
      .gte('created_at', thirtyDaysAgo),
    // CRM: all-time source breakdown
    supabase.from('customers')
      .select('source')
      .eq('agent_uid', user.id),
    // CRM: converted (have a signed/finalized contract)
    supabase.from('contracts')
      .select('customer_id')
      .eq('agent_uid', user.id)
      .or('status.eq.signed,status.eq.completed,is_finalized.eq.true')
      .not('customer_id', 'is', null),
    // CRM: upcoming appointment count
    supabase.from('appointments')
      .select('*', { count: 'exact', head: true })
      .eq('agent_uid', user.id)
      .gte('start_time', now.toISOString()),
    // CRM: published properties
    supabase.from('stock')
      .select('*', { count: 'exact', head: true })
      .eq('agent_uid', user.id)
      .eq('is_published', true),
    // New inquiries from public listing (last 7 days)
    supabase.from('property_inquiries')
      .select('id, created_at, stock_id, budget, customer:customers(id, nickname, first_name_th, last_name_th, phone), stock:stock(project_name, unit_no)')
      .eq('agent_uid', user.id)
      .gte('created_at', new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(10),
  ])

  // ─── KPI calculations ───────────────────────────────────────

  const commissionSum = (commissionThisMonth ?? []).reduce((s, c) => s + (c.commission_net ?? 0), 0)

  const { data: profile } = await supabase
    .from('profiles').select('plan, plan_expires_at, account_status').eq('id', user.id).single()

  const plan     = resolvePlan(profile?.plan)
  const planName = PLAN_META[plan].label
  const expiresAt = profile?.plan_expires_at ? new Date(profile.plan_expires_at) : null
  const isExpired = expiresAt ? expiresAt < now : false
  const daysLeft = expiresAt ? Math.ceil((expiresAt.getTime() - now.getTime()) / 86400000) : null
  const isPaid = !!profile?.plan && profile.plan !== 'starter'

  // ─── CRM analytics ─────────────────────────────────────────

  const totalLeads = totalCustomers ?? 0

  const newLeadsToday = (customersLast30 ?? []).filter(
    c => new Date(c.created_at).toLocaleDateString('en-CA') === todayStr
  ).length

  const newLeadsThisMonth = (customersLast30 ?? []).filter(
    c => c.created_at >= thisMonthStart
  ).length

  const convertedSet = new Set(
    (convertedContractCustomers ?? []).map(c => c.customer_id).filter(Boolean)
  )
  const convertedCount = convertedSet.size
  const conversionRate = totalLeads > 0 ? Math.round((convertedCount / totalLeads) * 100) : 0

  // Source counts (all-time)
  const sourceCountMap: Record<string, number> = {}
  for (const c of allCustomerSources ?? []) {
    const src = (c.source as string) || 'other'
    sourceCountMap[src] = (sourceCountMap[src] ?? 0) + 1
  }
  const topSources = Object.entries(sourceCountMap)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 6)

  // 30-day trend
  const last30Dates = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(now)
    d.setDate(d.getDate() - (29 - i))
    return d.toLocaleDateString('en-CA')
  })
  const trendCounts = last30Dates.map(date =>
    (customersLast30 ?? []).filter(
      c => new Date(c.created_at).toLocaleDateString('en-CA') === date
    ).length
  )
  const trendMax = Math.max(...trendCounts, 1)
  const trendTotal = trendCounts.reduce((a, b) => a + b, 0)

  return (
    <div className="p-4 lg:p-8 pt-6">
      {/* Dashboard top banner */}
      <BannerStrip position="dashboard_top" />

      {/* Pending approval notice */}
      {profile?.account_status === 'pending' && <PendingApprovalBanner />}

      <div className="mb-4 mt-4">
        <h1 className="text-2xl font-bold text-gray-900">แดชบอร์ด</h1>
        <p className="text-gray-500 text-sm mt-0.5">ภาพรวมของคุณ</p>
      </div>

      {/* Plan info banner */}
      <div className={`flex items-center justify-between rounded-xl border px-4 py-3 mb-6 ${
        isExpired ? 'bg-red-50 border-red-200' : isPaid ? 'bg-blue-50 border-blue-100' : 'bg-gray-50 border-gray-200'
      }`}>
        <div>
          <p className="text-xs text-gray-400">แพ็กเกจปัจจุบัน</p>
          <p className="font-semibold text-gray-900 text-sm">{planName}</p>
          {expiresAt && (
            <p className={`text-xs mt-0.5 ${isExpired ? 'text-red-600 font-medium' : daysLeft! <= 30 ? 'text-orange-500' : 'text-gray-400'}`}>
              {isExpired
                ? 'หมดอายุแล้ว — กรุณาต่ออายุ'
                : `หมดอายุ ${expiresAt.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })} (อีก ${daysLeft} วัน)`}
            </p>
          )}
        </div>
        <Link
          href="/services"
          className={`text-xs px-3 py-1.5 rounded-lg font-medium transition whitespace-nowrap ${
            isExpired || !isPaid
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'border border-gray-200 text-gray-600 hover:bg-white'
          }`}
        >
          {isExpired ? 'ต่ออายุ' : isPaid ? 'ดูแพ็กเกจ' : 'อัปเกรด'}
        </Link>
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

        {/* Right column: new inquiries + appointments + expiring */}
        <div className="space-y-4">
          {/* New inquiries from public listing */}
          {(recentInquiries?.length ?? 0) > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-blue-100 ring-1 ring-blue-100">
              <div className="p-4 border-b border-blue-100 flex items-center justify-between bg-blue-50/50">
                <div className="flex items-center gap-2">
                  <span className="text-base">🔔</span>
                  <h2 className="font-semibold text-blue-900 text-sm">คำขอสนใจใหม่ (7 วัน)</h2>
                </div>
                <span className="text-xs font-bold text-white bg-blue-600 px-2 py-0.5 rounded-full">
                  {recentInquiries!.length}
                </span>
              </div>
              <div className="divide-y divide-gray-50">
                {recentInquiries!.map(inq => {
                  const cust = Array.isArray(inq.customer) ? inq.customer[0] : inq.customer
                  const stk = Array.isArray(inq.stock) ? inq.stock[0] : inq.stock
                  const name = (cust as { nickname?: string; first_name_th?: string; last_name_th?: string } | null)?.nickname
                    || [(cust as { first_name_th?: string } | null)?.first_name_th, (cust as { last_name_th?: string } | null)?.last_name_th].filter(Boolean).join(' ')
                    || '—'
                  const stockLabel = [(stk as { project_name?: string } | null)?.project_name, (stk as { unit_no?: string } | null)?.unit_no].filter(Boolean).join(' · ')
                  const custId = (cust as { id?: string } | null)?.id
                  return (
                    <Link key={inq.id} href={custId ? `/customers/${custId}` : `/stock/${inq.stock_id}`}
                      className="flex items-start justify-between p-3 hover:bg-blue-50/30 transition">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{name}</p>
                        {stockLabel && <p className="text-xs text-gray-400 truncate">{stockLabel}</p>}
                        {(inq as { budget?: string }).budget && (
                          <span className="text-[11px] px-1.5 py-0.5 bg-green-50 text-green-700 rounded-full">{(inq as { budget?: string }).budget}</span>
                        )}
                      </div>
                      <span className="text-[10px] text-blue-400 whitespace-nowrap flex-shrink-0 ml-2 mt-0.5">
                        {new Date(inq.created_at).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}
                      </span>
                    </Link>
                  )
                })}
              </div>
            </div>
          )}

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

      {/* ─── CRM & Lead Analytics ──────────────────────────────── */}
      <div className="mt-10">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-lg font-bold text-gray-900">CRM & ลูกค้าเป้าหมาย</h2>
          <Link href="/customers" className="text-xs text-blue-600 hover:underline">จัดการลูกค้า →</Link>
        </div>
        <p className="text-xs text-gray-400 mb-4">ข้อมูลทั้งหมดของบัญชีคุณ · เทรนด์ 30 วันล่าสุด</p>

        {/* CRM KPI row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <CrmKpiCard
            label="ลูกค้าทั้งหมด"
            value={totalLeads}
            badge={totalLeads > 0 ? `+${newLeadsToday} วันนี้` : undefined}
            badgeColor="blue"
            icon="👥"
            href="/customers"
          />
          <CrmKpiCard
            label="เพิ่มวันนี้"
            value={newLeadsToday}
            badge={newLeadsToday > 0 ? 'ใหม่' : undefined}
            badgeColor="green"
            icon="🆕"
            href="/customers"
          />
          <CrmKpiCard
            label="เพิ่มเดือนนี้"
            value={newLeadsThisMonth}
            badge={`${trendTotal} / 30 วัน`}
            badgeColor="cyan"
            icon="📅"
            href="/customers"
          />
          <CrmKpiCard
            label="Conversion Rate"
            value={`${conversionRate}%`}
            badge={`${convertedCount} / ${totalLeads} ราย`}
            badgeColor={conversionRate >= 20 ? 'green' : 'gray'}
            icon="🎯"
            href="/customers"
          />
        </div>

        {/* Charts row */}
        <div className="grid lg:grid-cols-2 gap-4 mb-4">
          {/* 30-day trend sparkline */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-semibold text-gray-800">ลูกค้าใหม่ 30 วันล่าสุด</h3>
                <p className="text-xs text-gray-400 mt-0.5">{trendTotal} ราย</p>
              </div>
              <span className="text-2xl font-bold text-blue-600">{newLeadsThisMonth}</span>
            </div>
            <Sparkline data={trendCounts} max={trendMax} />
            <div className="flex justify-between mt-2">
              <span className="text-[10px] text-gray-300">30 วันก่อน</span>
              <span className="text-[10px] text-gray-300">วันนี้</span>
            </div>
          </div>

          {/* Source breakdown */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-800">แหล่งที่มาลูกค้า</h3>
              <span className="text-xs text-gray-400">{totalLeads} รายทั้งหมด</span>
            </div>
            {topSources.length === 0 ? (
              <div className="py-6 text-center text-sm text-gray-400">ยังไม่มีข้อมูลแหล่งที่มา</div>
            ) : (
              <div className="space-y-2.5">
                {topSources.map(([src, count]) => (
                  <SourceBar
                    key={src}
                    label={SOURCE_LABELS[src] ?? src}
                    count={count}
                    total={totalLeads}
                    colorClass={SOURCE_COLORS[src] ?? 'bg-gray-400'}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Activity tiles */}
        <div className="grid grid-cols-3 gap-3">
          <ActivityTile
            emoji="📅"
            label="นัดหมายที่รอ"
            value={upcomingApptCount ?? 0}
            href="/calendar"
            colorClass="bg-blue-50 border-blue-100 text-blue-700"
          />
          <ActivityTile
            emoji="🏠"
            label="ทรัพย์เผยแพร่"
            value={publishedStockCount ?? 0}
            href="/stock"
            colorClass="bg-emerald-50 border-emerald-100 text-emerald-700"
          />
          <ActivityTile
            emoji="✅"
            label="ลูกค้า Converted"
            value={convertedCount}
            href="/customers"
            colorClass="bg-violet-50 border-violet-100 text-violet-700"
          />
        </div>
      </div>
    </div>
  )
}

// ─── Existing KpiCard ────────────────────────────────────────────

const COLOR_MAP: Record<string, { card: string; value: string; sub: string }> = {
  blue:   { card: 'bg-blue-50 border-blue-100',    value: 'text-blue-700',   sub: 'text-blue-500' },
  orange: { card: 'bg-orange-50 border-orange-100', value: 'text-orange-700', sub: 'text-orange-500' },
  violet: { card: 'bg-violet-50 border-violet-100', value: 'text-violet-700', sub: 'text-violet-500' },
  slate:  { card: 'bg-slate-50 border-slate-100',   value: 'text-slate-700',  sub: 'text-slate-500' },
  green:  { card: 'bg-green-50 border-green-100',   value: 'text-green-700',  sub: 'text-green-500' },
  yellow: { card: 'bg-yellow-50 border-yellow-100', value: 'text-yellow-700', sub: 'text-yellow-600' },
  cyan:   { card: 'bg-cyan-50 border-cyan-100',     value: 'text-cyan-700',   sub: 'text-cyan-500' },
  rose:   { card: 'bg-rose-50 border-rose-100',     value: 'text-rose-700',   sub: 'text-rose-500' },
}

function KpiCard({
  color, label, value, sub, href,
}: {
  color: string; label: string; value: string | number; sub?: React.ReactNode; href: string
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

// ─── CRM KpiCard ─────────────────────────────────────────────────

const BADGE_COLORS: Record<string, string> = {
  blue:  'bg-blue-100 text-blue-600',
  green: 'bg-green-100 text-green-600',
  cyan:  'bg-cyan-100 text-cyan-600',
  gray:  'bg-gray-100 text-gray-500',
}

function CrmKpiCard({
  label, value, badge, badgeColor = 'gray', icon, href,
}: {
  label: string; value: string | number; badge?: string; badgeColor?: string; icon: string; href: string
}) {
  return (
    <Link href={href} className="block bg-white rounded-xl border border-gray-100 shadow-sm p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="text-xl">{icon}</span>
        {badge && (
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium leading-tight ${BADGE_COLORS[badgeColor] ?? BADGE_COLORS.gray}`}>
            {badge}
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
    </Link>
  )
}

// ─── SVG Sparkline ───────────────────────────────────────────────

function Sparkline({ data, max }: { data: number[]; max: number }) {
  if (data.length < 2) return <div className="h-12 bg-gray-50 rounded-lg" />

  const W = 600
  const H = 48
  const pad = 2

  const pts = data.map((v, i) => [
    pad + (i / (data.length - 1)) * (W - pad * 2),
    H - pad - (v / max) * (H - pad * 2) * 0.92,
  ] as [number, number])

  const linePath = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  const areaPath = linePath + ` L${pts[pts.length - 1]![0].toFixed(1)},${H} L${pts[0]![0].toFixed(1)},${H} Z`

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      style={{ height: 48 }}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.01" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#sparkGrad)" />
      <path d={linePath} fill="none" stroke="#3B82F6" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      {/* Highlight dots for non-zero values */}
      {pts.map(([x, y], i) =>
        data[i]! > 0 ? (
          <circle key={i} cx={x} cy={y} r="2.5" fill="#3B82F6" />
        ) : null
      )}
    </svg>
  )
}

// ─── Source Bar ──────────────────────────────────────────────────

function SourceBar({
  label, count, total, colorClass,
}: {
  label: string; count: number; total: number; colorClass: string
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0
  return (
    <div className="flex items-center gap-2.5">
      <span className="text-xs text-gray-500 w-28 shrink-0 truncate">{label}</span>
      <div className="flex-1 bg-gray-100 rounded-full h-1.5 min-w-0">
        <div
          className={`h-1.5 rounded-full transition-all ${colorClass}`}
          style={{ width: `${Math.max(pct, 2)}%` }}
        />
      </div>
      <span className="text-xs font-semibold text-gray-700 w-6 text-right shrink-0">{count}</span>
      <span className="text-[10px] text-gray-400 w-8 text-right shrink-0">{pct}%</span>
    </div>
  )
}

// ─── Activity Tile ───────────────────────────────────────────────

function ActivityTile({
  emoji, label, value, href, colorClass,
}: {
  emoji: string; label: string; value: number; href: string; colorClass: string
}) {
  return (
    <Link
      href={href}
      className={`flex flex-col items-center justify-center gap-1 rounded-xl border p-3 text-center shadow-sm hover:shadow-md transition-shadow ${colorClass}`}
    >
      <span className="text-xl">{emoji}</span>
      <p className="text-xl font-bold leading-none">{value}</p>
      <p className="text-[11px] font-medium leading-tight opacity-80">{label}</p>
    </Link>
  )
}
