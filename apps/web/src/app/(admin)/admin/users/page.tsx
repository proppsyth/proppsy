import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
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

  // ── Find duplicate national_ids across ALL profiles ────────────
  const nationalIds = (users ?? [])
    .map(u => u.national_id)
    .filter((id): id is string => !!id && id !== '')

  let duplicateNationalIds = new Set<string>()
  if (nationalIds.length > 0) {
    const { data: allWithSameId } = await admin
      .from('profiles')
      .select('national_id')
      .in('national_id', nationalIds)

    const counts2 = new Map<string, number>()
    for (const p of (allWithSameId ?? [])) {
      if (p.national_id) {
        counts2.set(p.national_id, (counts2.get(p.national_id) ?? 0) + 1)
      }
    }
    duplicateNationalIds = new Set(
      [...counts2.entries()]
        .filter(([, c]) => c > 1)
        .map(([id]) => id)
    )
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
            <UserCard
              key={u.id}
              user={u as Profile}
              tab={tab}
              isDuplicateId={!!(u.national_id && duplicateNationalIds.has(u.national_id))}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function UserCard({ user, tab, isDuplicateId }: { user: Profile; tab: Tab; isDuplicateId: boolean }) {
  const planMeta = PLAN_META[resolvePlan(user.plan)]
  const createdDate = new Date(user.created_at).toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
  const isGoogle = user.auth_provider === 'google'

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex flex-col gap-3">
      {/* Duplicate national ID warning */}
      {isDuplicateId && (
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          <span className="text-amber-500 text-sm flex-shrink-0">⚠️</span>
          <p className="text-xs text-amber-700 font-medium">เลขบัตรประชาชนซ้ำกับบัญชีอื่นในระบบ</p>
        </div>
      )}

      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="w-10 h-10 rounded-full flex-shrink-0 overflow-hidden bg-blue-100 flex items-center justify-center text-blue-700 font-semibold text-sm">
          {user.avatar_url ? (
            <Image
              src={user.avatar_url}
              alt={user.name ?? ''}
              width={40}
              height={40}
              className="w-full h-full object-cover"
              unoptimized
            />
          ) : (
            ((user.nickname || user.name || user.email || 'U').charAt(0)).toUpperCase()
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="font-medium text-gray-900 truncate">{user.name || '—'}</p>
            {isGoogle && (
              <span className="flex items-center gap-1 px-1.5 py-0.5 bg-blue-50 border border-blue-100 rounded-full text-[10px] font-medium text-blue-600 flex-shrink-0">
                <svg width="10" height="10" viewBox="0 0 18 18" fill="none">
                  <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                  <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" fill="#34A853"/>
                  <path d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.175 0 7.548 0 9s.348 2.825.957 4.039l3.007-2.332z" fill="#FBBC05"/>
                  <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
                </svg>
                Google
              </span>
            )}
          </div>
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
        {user.national_id && (
          <div className="flex items-center gap-2 text-gray-600">
            <span>🪪</span>
            <span className="text-sm font-mono tracking-wide">
              {user.national_id.replace(/(\d{1})(\d{4})(\d{5})(\d{2})(\d{1})/, '$1-$2-$3-$4-$5')}
            </span>
          </div>
        )}
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
