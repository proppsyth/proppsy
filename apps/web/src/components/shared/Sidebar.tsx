'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import {
  Users, UserCheck, Building2, Calendar,
  TrendingUp, Settings, LogOut, ShieldCheck, HelpCircle,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types'
import MobileBottomNav from './MobileBottomNav'

interface SidebarProps {
  profile: Profile
}

const NAV_ITEMS = [
  { href: '/dashboard', icon: '📊', label: 'แดชบอร์ด', permission: null },
  { href: '/stock', icon: '🏠', label: 'ทรัพย์', permission: 'stock' },
  { href: '/owners', icon: '👤', label: 'เจ้าของทรัพย์', permission: 'owner' },
  { href: '/customers', icon: '👥', label: 'ลูกค้า', permission: 'customer' },
  { href: '/projects', icon: '🏢', label: 'โครงการ', permission: 'project' },
  { href: '/contracts', icon: '📄', label: 'สัญญา', permission: 'contract' },
  { href: '/calendar', icon: '📅', label: 'นัดหมาย & ปฏิทิน', permission: null },
  { href: '/commission', icon: '💰', label: 'คอมมิชชัน', permission: null },
  { href: '/help', icon: '❓', label: 'คู่มือ & FAQ', permission: null },
]

const ADMIN_ITEMS = [
  { href: '/admin/users', icon: '👑', label: 'จัดการผู้ใช้' },
  { href: '/admin/news', icon: '📰', label: 'จัดการข่าว' },
]

const MORE_ITEMS_BASE = [
  { href: '/owners', icon: UserCheck, label: 'เจ้าของทรัพย์' },
  { href: '/customers', icon: Users, label: 'ลูกค้า' },
  { href: '/projects', icon: Building2, label: 'โครงการ' },
  { href: '/calendar', icon: Calendar, label: 'นัดหมาย & ปฏิทิน' },
  { href: '/commission', icon: TrendingUp, label: 'คอมมิชชัน' },
  { href: '/help', icon: HelpCircle, label: 'คู่มือ & FAQ' },
]

const MORE_ITEM_ADMIN = { href: '/admin/users', icon: ShieldCheck, label: 'จัดการผู้ใช้' }
const MORE_ITEM_PROFILE = { href: '/profile', icon: Settings, label: 'โปรไฟล์' }

export default function Sidebar({ profile }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [moreOpen, setMoreOpen] = useState(false)

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === href
    if (href === '/calendar') return pathname.startsWith('/calendar') || pathname.startsWith('/appointments')
    return pathname.startsWith(href)
  }

  const hasPermission = (permission: string | null) => {
    if (!permission) return true
    if (profile.role === 'admin') return true
    return profile.permissions?.[permission as keyof typeof profile.permissions] ?? false
  }

  return (
    <>
      {/* ── Desktop Sidebar ── */}
      <aside className="hidden lg:flex fixed left-0 top-0 h-full w-64 bg-white border-r border-gray-200 flex-col z-30">
        <div className="p-4 border-b border-gray-100">
          <Link href="/" className="flex items-center gap-2.5">
            <Image src="/logo/logo-icon.jpg" alt="Proppsy" width={32} height={32} className="object-contain rounded-lg flex-shrink-0" />
            <span className="font-bold text-lg text-gray-900 tracking-tight leading-none">Proppsy</span>
          </Link>
        </div>

        <div className="px-4 py-3 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-semibold text-sm">
              {(profile.nickname || profile.name || 'U').charAt(0)}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate">{profile.nickname || profile.name}</p>
              <p className="text-xs text-gray-400 truncate">{profile.position || profile.company_name || profile.email}</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.filter(item => hasPermission(item.permission)).map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                isActive(item.href)
                  ? 'bg-blue-600 text-white font-medium'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <span className="w-5 shrink-0 text-center leading-none">{item.icon}</span>
              {item.label}
            </Link>
          ))}

          {profile.role === 'admin' && (
            <>
              <div className="pt-4 pb-1 px-3">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">แอดมิน</p>
              </div>
              {ADMIN_ITEMS.map(item => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                    isActive(item.href)
                      ? 'bg-blue-600 text-white font-medium'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <span className="w-5 shrink-0 text-center leading-none">{item.icon}</span>
                  {item.label}
                </Link>
              ))}
            </>
          )}
        </nav>

        <div className="p-3 border-t border-gray-100 space-y-0.5">
          <Link href="/profile"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition">
            <span>⚙️</span> โปรไฟล์ของฉัน
          </Link>
          <button onClick={handleSignOut}
            className="flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-red-500 hover:bg-red-50 transition">
            <span>🚪</span> ออกจากระบบ
          </button>
        </div>
      </aside>

      {/* ── Mobile: top bar ── */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-white/95 backdrop-blur border-b border-gray-100 flex items-center justify-between px-4 z-30">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/logo/logo-icon.jpg" alt="Proppsy" width={26} height={26} className="object-contain rounded-md flex-shrink-0" />
          <span className="font-bold text-base text-gray-900 tracking-tight">Proppsy</span>
        </Link>
        <button
          onClick={() => setMoreOpen(true)}
          className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-bold text-sm active:bg-blue-200 transition"
        >
          {(profile.nickname || profile.name || 'U').charAt(0).toUpperCase()}
        </button>
      </div>

      {/* ── Mobile Bottom Navigation ── */}
      <MobileBottomNav profile={profile} />

      {/* ── More Backdrop ── */}
      {moreOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
          onClick={() => setMoreOpen(false)}
        />
      )}

      {/* ── More Sheet ── */}
      <div className={`lg:hidden fixed left-0 right-0 z-50 bg-white rounded-t-3xl shadow-xl transition-all duration-300 ease-out ${
        moreOpen ? 'bottom-0' : '-bottom-full'
      }`}>
        <div className="px-5 pt-5 pb-safe pb-8">
          <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />

          <div className="flex items-center gap-3 mb-5 p-4 bg-gray-50 rounded-2xl">
            <div className="w-11 h-11 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-bold flex-shrink-0">
              {(profile.nickname || profile.name || 'U').charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-gray-900 text-sm truncate">{profile.nickname || profile.name}</p>
              <p className="text-xs text-gray-400 truncate">{profile.position || profile.company_name || profile.email}</p>
            </div>
            <Link href="/profile" onClick={() => setMoreOpen(false)}>
              <Settings className="w-4 h-4 text-gray-400" />
            </Link>
          </div>

          <div className="grid grid-cols-3 gap-2.5 mb-5">
            {[...MORE_ITEMS_BASE, profile.role === 'admin' ? MORE_ITEM_ADMIN : MORE_ITEM_PROFILE].map(item => {
              const Icon = item.icon
              const active = isActive(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMoreOpen(false)}
                  className={`flex flex-col items-center gap-2 py-4 rounded-2xl transition active:scale-95 ${
                    active ? 'bg-blue-50 text-blue-700' : 'bg-gray-50 text-gray-600'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-[11px] font-medium text-center leading-tight">{item.label}</span>
                </Link>
              )
            })}
          </div>

          <button
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-2 py-3.5 text-red-500 bg-red-50 rounded-2xl text-sm font-semibold active:bg-red-100 transition"
          >
            <LogOut className="w-4 h-4" />
            ออกจากระบบ
          </button>
        </div>
      </div>
    </>
  )
}
