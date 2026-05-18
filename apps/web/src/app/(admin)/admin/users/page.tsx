import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import type { Profile } from '@/types'
import { PLAN_META, resolvePlan } from '@/types'
import UserActions from './UserActions'

export const metadata: Metadata = { title: 'จัดการผู้ใช้ — Admin' }

type Tab = 'pending' | 'approved' | 'rejected'

const TABS: { key: Tab; label: string }[] = [
  { key: 'pending', label: 'รอการอนุมัติ' },
  { key: 'approved', label: 'อนุมัติแล้ว' },
  { key: 'rejected', label: 'ปฏิเสธแล้ว' },
]

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-600',
}
const STATUS_LABELS: Record<string, string> = {
  pending: 'รอการอนุมัติ',
  approved: 'อนุมัติแล้ว',
  rejected: 'ปฏิเสธแล้ว',
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; q?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { tab: rawTab = 'pending', q = '' } = await searchParams
  const tab = (['pending', 'approved', 'rejected'].includes(rawTab) ? rawTab : 'pending') as Tab

  const admin = await createAdminClient()

  let query = admin
    .from('profiles')
    .select('*')
    .eq('account_status', tab)
    .neq('id', user.id)
    .order('created_at', { ascending: false })

  if (q.trim()) {
    query = query.or(`name.ilike.%${q}%,email.ilike.%${q}%,nickname.ilike.%${q}%,phone.ilike.%${q}%`)
  }

  const [{ data: users }, { count: pendingCount }, { count: approvedCount }, { count: rejectedCount }] =
    await Promise.all([
      query,
      admin.from('profiles').select('*', { count: 'exact', head: true }).eq('account_status', 'pending').neq('id', user.id),
      admin.from('profiles').select('*', { count: 'exact', head: true }).eq('account_status', 'approved').neq('id', user.id),
      admin.from('profiles').select('*', { count: 'exact', head: true }).eq('account_status', 'rejected').neq('id', user.id),
    ])

  const counts: Record<Tab, number> = {
    pending: pendingCount ?? 0,
    approved: approvedCount ?? 0,
    rejected: rejectedCount ?? 0,
  }

  return (
    <div className="p-4 lg:p-8 pt-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">จัดการผู้ใช้</h1>
        <p className="text-sm text-gray-400 mt-0.5">อนุมัติ ระงับ และจัดการบัญชีผู้ใช้งาน</p>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {TABS.map(t => (
          <Link
            key={t.key}
            href={`/admin/users?tab=${t.key}`}
            className={`rounded-xl border p-3 text-center transition ${
              tab === t.key
                ? 'border-blue-200 bg-blue-50'
                : 'border-gray-100 bg-white hover:border-gray-200'
            }`}
          >
            <p className={`text-xl font-bold ${tab === t.key ? 'text-blue-700' : 'text-gray-800'}`}>
              {counts[t.key]}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">{t.label}</p>
          </Link>
        ))}
      </div>

      {/* Tabs + Search */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-5">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
          {TABS.map(t => (
            <Link
              key={t.key}
              href={`/admin/users?tab=${t.key}${q ? `&q=${q}` : ''}`}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition ${
                tab === t.key
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.label}
              {counts[t.key] > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                  t.key === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-200 text-gray-600'
                }`}>
                  {counts[t.key]}
                </span>
              )}
            </Link>
          ))}
        </div>
        <form method="GET" action="/admin/users" className="flex-1 max-w-sm">
          <input type="hidden" name="tab" value={tab} />
          <input
            name="q"
            defaultValue={q}
            placeholder="ค้นหาชื่อ อีเมล เบอร์โทร..."
            className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          />
        </form>
      </div>

      {/* Users grid */}
      {!users?.length ? (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
          <p className="text-gray-400 text-sm">
            {q ? `ไม่พบผู้ใช้ที่ตรงกับ "${q}"` : 'ไม่มีผู้ใช้ในหมวดนี้'}
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {users.map(u => (
            <UserCard key={u.id} user={u as Profile} tab={tab} />
          ))}
        </div>
      )}
    </div>
  )
}

function UserCard({ user, tab }: { user: Profile; tab: Tab }) {
  const initials = ((user.nickname || user.name || user.email || 'U').charAt(0)).toUpperCase()
  const planMeta = PLAN_META[resolvePlan(user.plan)]
  const createdDate = new Date(user.created_at).toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-semibold text-sm flex-shrink-0">
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-gray-900 truncate">{user.name || '—'}</p>
          {user.nickname && (
            <p className="text-xs text-gray-400 truncate">"{user.nickname}"</p>
          )}
        </div>
        {tab !== 'pending' && (
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${STATUS_COLORS[user.account_status]}`}>
            {STATUS_LABELS[user.account_status]}
          </span>
        )}
      </div>

      <div className="space-y-1.5">
        <InfoRow icon="✉️" value={user.email} />
        <InfoRow icon="📱" value={user.phone} />
        {user.company_name && <InfoRow icon="🏢" value={user.company_name} />}
        {user.position && <InfoRow icon="💼" value={user.position} />}
        <InfoRow icon="📅" value={`สมัคร ${createdDate}`} />
      </div>

      <div className="flex items-center justify-between pt-1">
        <span className="text-xs text-gray-400">แพ็กเกจ</span>
        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${planMeta.badge}`}>
          {planMeta.label}
        </span>
      </div>

      <UserActions user={user} />
    </div>
  )
}

function InfoRow({ icon, value }: { icon: string; value?: string | null }) {
  if (!value) return null
  return (
    <div className="flex items-center gap-2 text-gray-600">
      <span>{icon}</span>
      <span className="text-sm truncate">{value}</span>
    </div>
  )
}
