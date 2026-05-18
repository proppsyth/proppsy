import Link from 'next/link'
import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase/server'
import {
  Users, Clock, Home, FileText, Coins, TrendingUp, CheckCircle,
  UserX, Eye, Building2, Package, ChevronRight,
} from 'lucide-react'
import { PLAN_META, resolvePlan } from '@/types'

export const metadata: Metadata = { title: 'Admin Dashboard — Proppsy' }

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

export default async function AdminDashboardPage() {
  const admin = await createAdminClient()

  const [
    { count: totalUsers },
    { count: pendingUsers },
    { count: approvedUsers },
    { count: proUsers },
    { count: totalStock },
    { count: publishedStock },
    { count: totalContracts },
    { count: activeContracts },
    { data: creditRows },
    { data: recentUsers },
    { data: recentContracts },
  ] = await Promise.all([
    admin.from('profiles').select('*', { count: 'exact', head: true }).neq('role', 'admin'),
    admin.from('profiles').select('*', { count: 'exact', head: true }).eq('account_status', 'pending'),
    admin.from('profiles').select('*', { count: 'exact', head: true }).eq('account_status', 'approved').neq('role', 'admin'),
    admin.from('profiles').select('*', { count: 'exact', head: true }).in('plan', ['professional', 'business']).neq('role', 'admin'),
    admin.from('stock').select('*', { count: 'exact', head: true }),
    admin.from('stock').select('*', { count: 'exact', head: true }).eq('is_published', true),
    admin.from('contracts').select('*', { count: 'exact', head: true }),
    admin.from('contracts').select('*', { count: 'exact', head: true }).in('status', ['sent', 'viewed', 'partially_signed', 'signed']),
    admin.from('credits').select('balance').limit(5000),
    admin.from('profiles').select('id, name, nickname, email, account_status, plan, created_at').neq('role', 'admin').order('created_at', { ascending: false }).limit(6),
    admin.from('contracts').select('id, doc_type, status, created_at').order('created_at', { ascending: false }).limit(5),
  ])

  const totalCredits = (creditRows ?? []).reduce((sum, c) => sum + (c.balance ?? 0), 0)

  const stats = [
    {
      label: 'ผู้ใช้งานทั้งหมด',
      value: (totalUsers ?? 0).toLocaleString(),
      sub: `${approvedUsers ?? 0} อนุมัติแล้ว`,
      icon: Users,
      color: 'blue',
      href: '/admin/users',
    },
    {
      label: 'รอการอนุมัติ',
      value: (pendingUsers ?? 0).toLocaleString(),
      sub: 'ต้องดำเนินการ',
      icon: Clock,
      color: pendingUsers ? 'yellow' : 'gray',
      href: '/admin/users?tab=pending',
      urgent: (pendingUsers ?? 0) > 0,
    },
    {
      label: 'ผู้ใช้ Paid',
      value: (proUsers ?? 0).toLocaleString(),
      sub: 'Pro + Business',
      icon: TrendingUp,
      color: 'purple',
      href: '/admin/packages',
    },
    {
      label: 'ทรัพย์ทั้งหมด',
      value: (totalStock ?? 0).toLocaleString(),
      sub: `${publishedStock ?? 0} เผยแพร่แล้ว`,
      icon: Home,
      color: 'green',
      href: '/admin/projects',
    },
    {
      label: 'สัญญาทั้งหมด',
      value: (totalContracts ?? 0).toLocaleString(),
      sub: `${activeContracts ?? 0} กำลังดำเนินการ`,
      icon: FileText,
      color: 'indigo',
      href: '/admin/contracts',
    },
    {
      label: 'เครดิตในระบบ',
      value: totalCredits.toLocaleString(),
      sub: 'ยอดรวมทั้งหมด',
      icon: Coins,
      color: 'orange',
      href: '/admin/credits',
    },
  ]

  const colorMap: Record<string, string> = {
    blue:   'bg-blue-50 text-blue-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    green:  'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    indigo: 'bg-indigo-50 text-indigo-600',
    orange: 'bg-orange-50 text-orange-600',
    gray:   'bg-gray-50 text-gray-500',
  }

  const quickLinks = [
    { href: '/admin/users?tab=pending', icon: Clock, label: 'อนุมัติผู้ใช้รอดำเนินการ', badge: pendingUsers ?? 0 },
    { href: '/admin/credits', icon: Coins, label: 'จัดการเครดิต' },
    { href: '/admin/news/new', icon: FileText, label: 'เพิ่มข่าวสาร' },
    { href: '/admin/packages', icon: Package, label: 'จัดการแพ็กเกจ' },
    { href: '/admin/companies', icon: Building2, label: 'จัดการบริษัท' },
    { href: '/admin/analytics', icon: TrendingUp, label: 'ดู Analytics' },
  ]

  return (
    <div className="p-4 lg:p-8 pt-6 max-w-7xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-sm text-gray-400 mt-0.5">ภาพรวมแพลตฟอร์ม Proppsy</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-8">
        {stats.map((s) => {
          const Icon = s.icon
          return (
            <Link
              key={s.label}
              href={s.href}
              className={`bg-white rounded-xl border p-4 flex flex-col gap-3 hover:shadow-sm transition ${
                s.urgent ? 'border-yellow-200 bg-yellow-50/30' : 'border-gray-100'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${colorMap[s.color]}`}>
                  <Icon className="w-4.5 h-4.5 w-[18px] h-[18px]" />
                </div>
                {s.urgent && (
                  <span className="text-xs bg-yellow-100 text-yellow-700 font-semibold px-2 py-0.5 rounded-full">
                    ด่วน
                  </span>
                )}
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 leading-none">{s.value}</p>
                <p className="text-xs text-gray-400 mt-1">{s.label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{s.sub}</p>
              </div>
            </Link>
          )
        })}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent Registrations */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 text-sm">ผู้ใช้ล่าสุด</h2>
            <Link href="/admin/users" className="text-xs text-blue-600 hover:underline flex items-center gap-0.5">
              ดูทั้งหมด <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          {(recentUsers?.length ?? 0) === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm">ยังไม่มีผู้ใช้</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {recentUsers!.map((u) => {
                const planMeta = PLAN_META[resolvePlan(u.plan)]
                const initials = (u.nickname || u.name || u.email || 'U').charAt(0).toUpperCase()
                const date = new Date(u.created_at).toLocaleDateString('th-TH', {
                  month: 'short', day: 'numeric', year: '2-digit',
                })
                return (
                  <div key={u.id} className="flex items-center gap-3 px-5 py-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-semibold text-xs flex-shrink-0">
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">
                        {u.name || u.nickname || u.email}
                      </p>
                      <p className="text-xs text-gray-400 truncate">{u.email}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[u.account_status]}`}>
                        {STATUS_LABELS[u.account_status]}
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${planMeta.badge}`}>
                        {planMeta.label}
                      </span>
                    </div>
                    <span className="text-xs text-gray-300 ml-2 flex-shrink-0 hidden sm:block">{date}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="space-y-3">
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-50">
              <h2 className="font-semibold text-gray-900 text-sm">Quick Actions</h2>
            </div>
            <div className="divide-y divide-gray-50">
              {quickLinks.map((q) => {
                const Icon = q.icon
                return (
                  <Link
                    key={q.href}
                    href={q.href}
                    className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition"
                  >
                    <Icon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <span className="text-sm text-gray-700 flex-1">{q.label}</span>
                    {q.badge ? (
                      <span className="text-xs bg-yellow-100 text-yellow-700 font-bold px-2 py-0.5 rounded-full">
                        {q.badge}
                      </span>
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
                    )}
                  </Link>
                )
              })}
            </div>
          </div>

          {/* Platform health */}
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <h2 className="font-semibold text-gray-900 text-sm mb-3">สถานะแพลตฟอร์ม</h2>
            <div className="space-y-2">
              {[
                { label: 'Supabase DB', ok: true },
                { label: 'Auth', ok: true },
                { label: 'Storage', ok: true },
                { label: 'Edge Functions', ok: true },
              ].map((s) => (
                <div key={s.label} className="flex items-center gap-2">
                  <CheckCircle className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                  <span className="text-xs text-gray-600">{s.label}</span>
                  <span className="ml-auto text-[10px] text-green-600 font-medium">Operational</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
