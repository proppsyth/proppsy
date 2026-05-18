import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { Coins } from 'lucide-react'
import CreditAdjustForm from './CreditAdjustForm'

export const metadata: Metadata = { title: 'จัดการเครดิต — Admin' }

const TX_TYPE_LABELS: Record<string, string> = {
  grant:  'มอบให้',
  topup:  'เติมเครดิต',
  spend:  'ใช้',
  reset:  'รีเซ็ต',
  assign: 'ปรับโดยแอดมิน',
  expire: 'หมดอายุ',
}

const TX_TYPE_COLORS: Record<string, string> = {
  grant:  'bg-green-100 text-green-700',
  topup:  'bg-blue-100 text-blue-700',
  spend:  'bg-red-100 text-red-600',
  reset:  'bg-gray-100 text-gray-600',
  assign: 'bg-yellow-100 text-yellow-700',
  expire: 'bg-gray-100 text-gray-500',
}

export default async function AdminCreditsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; uid?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { q = '', uid = '' } = await searchParams
  const admin = await createAdminClient()

  // Platform credit summary
  const [
    { data: creditSummary },
    { count: totalUsers },
    { count: usersWithCredits },
  ] = await Promise.all([
    admin.from('credits').select('balance, total_earned, total_spent').limit(5000),
    admin.from('profiles').select('*', { count: 'exact', head: true }).neq('role', 'admin'),
    admin.from('credits').select('*', { count: 'exact', head: true }).gt('balance', 0),
  ])

  const platformTotals = (creditSummary ?? []).reduce(
    (acc, c) => ({
      balance: acc.balance + (c.balance ?? 0),
      earned:  acc.earned + (c.total_earned ?? 0),
      spent:   acc.spent + (c.total_spent ?? 0),
    }),
    { balance: 0, earned: 0, spent: 0 }
  )

  // User search
  let userQuery = admin
    .from('profiles')
    .select('id, name, nickname, email, phone')
    .neq('role', 'admin')
    .order('name')
    .limit(30)

  if (q.trim()) {
    userQuery = userQuery.or(`name.ilike.%${q}%,email.ilike.%${q}%,nickname.ilike.%${q}%`)
  }
  const { data: users } = await userQuery

  // Selected user credit info
  let selectedUser: { id: string; name?: string; nickname?: string; email?: string } | null = null
  let selectedBalance: number | null = null

  if (uid) {
    const [{ data: prof }, { data: credits }] = await Promise.all([
      admin.from('profiles').select('id, name, nickname, email').eq('id', uid).single(),
      admin.from('credits').select('balance, total_earned, total_spent').eq('user_id', uid).maybeSingle(),
    ])
    selectedUser = prof
    selectedBalance = credits?.balance ?? 0
  }

  // Recent transactions (all users, last 50)
  const { data: recentTx } = await admin
    .from('credit_transactions')
    .select('id, user_id, amount, balance_after, type, description, created_at')
    .order('created_at', { ascending: false })
    .limit(50)

  // Map user ids to names for display
  const { data: txProfiles } = await admin
    .from('profiles')
    .select('id, name, nickname, email')
    .in('id', [...new Set((recentTx ?? []).map(t => t.user_id))])

  const profileMap = Object.fromEntries(
    (txProfiles ?? []).map(p => [p.id, p.nickname || p.name || p.email || p.id])
  )

  return (
    <div className="p-4 lg:p-8 pt-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">จัดการเครดิต</h1>
        <p className="text-sm text-gray-400 mt-0.5">ปรับเครดิต เพิ่ม/หัก และดูประวัติธุรกรรม</p>
      </div>

      {/* Platform credit summary */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        {[
          { label: 'เครดิตในระบบ', value: platformTotals.balance.toLocaleString(), sub: `ผู้ใช้ ${usersWithCredits ?? 0} คนมีเครดิต`, color: 'indigo' },
          { label: 'เครดิตที่ออกทั้งหมด', value: platformTotals.earned.toLocaleString(), sub: 'ตลอดเวลา', color: 'green' },
          { label: 'เครดิตที่ใช้ไปแล้ว', value: platformTotals.spent.toLocaleString(), sub: `จากผู้ใช้ ${totalUsers ?? 0} คน`, color: 'red' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-100 p-4">
            <p className="text-2xl font-bold text-gray-900">{s.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
            <p className="text-xs text-gray-400">{s.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        {/* Left: User search + adjust */}
        <div className="lg:col-span-2 space-y-4">
          {/* Search */}
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-50">
              <p className="text-sm font-semibold text-gray-700">เลือกผู้ใช้</p>
            </div>
            <div className="p-3">
              <form method="GET" action="/admin/credits">
                {uid && <input type="hidden" name="uid" value={uid} />}
                <input
                  name="q"
                  defaultValue={q}
                  placeholder="ค้นหาชื่อ / อีเมล..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </form>
            </div>
            <div className="max-h-64 overflow-y-auto divide-y divide-gray-50">
              {(users ?? []).map((u) => (
                <a
                  key={u.id}
                  href={`/admin/credits?uid=${u.id}${q ? `&q=${q}` : ''}`}
                  className={`flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition ${uid === u.id ? 'bg-blue-50' : ''}`}
                >
                  <div className="w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-semibold text-xs flex-shrink-0">
                    {(u.nickname || u.name || u.email || 'U').charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm text-gray-800 truncate">{u.nickname || u.name || u.email}</p>
                    <p className="text-xs text-gray-400 truncate">{u.email}</p>
                  </div>
                </a>
              ))}
              {(users ?? []).length === 0 && (
                <p className="text-center text-gray-400 text-sm py-6">ไม่พบผู้ใช้</p>
              )}
            </div>
          </div>

          {/* Adjust form */}
          {selectedUser && selectedBalance !== null ? (
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-50">
                <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-bold text-sm flex-shrink-0">
                  {(selectedUser.nickname || selectedUser.name || 'U').charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 text-sm truncate">
                    {selectedUser.nickname || selectedUser.name}
                  </p>
                  <p className="text-xs text-gray-400 truncate">{selectedUser.email}</p>
                </div>
              </div>
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-gray-500">ยอดเครดิตปัจจุบัน</p>
                <div className="flex items-center gap-1.5 bg-indigo-50 px-3 py-1.5 rounded-xl">
                  <Coins className="w-4 h-4 text-indigo-600" />
                  <span className="font-bold text-indigo-700 text-lg">{selectedBalance.toLocaleString()}</span>
                </div>
              </div>
              <CreditAdjustForm userId={selectedUser.id} currentBalance={selectedBalance} />
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-100 p-8 text-center">
              <Coins className="w-8 h-8 mx-auto mb-2 text-gray-200" />
              <p className="text-sm text-gray-400">เลือกผู้ใช้เพื่อปรับเครดิต</p>
            </div>
          )}
        </div>

        {/* Right: Transaction log */}
        <div className="lg:col-span-3 bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50">
            <h2 className="font-semibold text-gray-900 text-sm">ประวัติธุรกรรมล่าสุด</h2>
          </div>
          {(recentTx?.length ?? 0) === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm">ยังไม่มีธุรกรรม</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-50">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">ผู้ใช้</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">ประเภท</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">จำนวน</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide hidden sm:table-cell">คงเหลือ</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide hidden md:table-cell">วันที่</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {recentTx!.map((tx) => (
                    <tr key={tx.id} className="hover:bg-gray-50/50 transition">
                      <td className="px-4 py-3">
                        <p className="text-gray-800 text-xs truncate max-w-[120px]">
                          {profileMap[tx.user_id] ?? tx.user_id.slice(0, 8)}
                        </p>
                        {tx.description && (
                          <p className="text-gray-400 text-[11px] truncate max-w-[120px]">{tx.description}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${TX_TYPE_COLORS[tx.type] ?? 'bg-gray-100 text-gray-600'}`}>
                          {TX_TYPE_LABELS[tx.type] ?? tx.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`font-semibold text-sm ${tx.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {tx.amount > 0 ? '+' : ''}{tx.amount.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-gray-600 text-xs hidden sm:table-cell">
                        {tx.balance_after?.toLocaleString() ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-400 text-[11px] hidden md:table-cell">
                        {new Date(tx.created_at).toLocaleDateString('th-TH', {
                          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
