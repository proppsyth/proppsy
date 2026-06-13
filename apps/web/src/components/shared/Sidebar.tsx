'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, Home as HomeIcon, FileText, UserCheck, Users, Building2,
  Calendar, TrendingUp, Zap, CreditCard, Settings, LogOut, ShieldAlert,
  Menu, ChevronRight, Bell, Handshake,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types'
import MobileBottomNav from './MobileBottomNav'
import NotificationBell from './NotificationBell'

interface SidebarProps {
  profile: Profile
}

const NAV_ITEMS: { href: string; icon: LucideIcon; label: string; permission: string | null }[] = [
  { href: '/dashboard',          icon: LayoutDashboard, label: 'แดชบอร์ด',        permission: null },
  { href: '/dashboard/activity', icon: Bell,            label: 'กิจกรรม',          permission: null },
  { href: '/stock',              icon: HomeIcon,        label: 'ทรัพย์',            permission: 'stock' },
  { href: '/owners',             icon: UserCheck,       label: 'เจ้าของทรัพย์',    permission: 'owner' },
  { href: '/customers',          icon: Users,           label: 'ลูกค้า',            permission: 'customer' },
  { href: '/projects',           icon: Building2,       label: 'โครงการ',           permission: 'project' },
  { href: '/contracts',          icon: FileText,        label: 'สัญญา',             permission: 'contract' },
  { href: '/co-agents',          icon: Handshake,       label: 'Co-Agent',          permission: null },
  { href: '/calendar',           icon: Calendar,        label: 'นัดหมาย & ปฏิทิน', permission: null },
  { href: '/commission',         icon: TrendingUp,      label: 'คอมมิชชัน',         permission: null },
  { href: '/credits',            icon: Zap,             label: 'เครดิต',            permission: null },
]

// Public nav items for the hamburger dropdown
const DROPDOWN_NAV = [
  { href: '/services', label: 'บริการ' },
  { href: '/news',     label: 'ข่าวสาร' },
  { href: '/about',    label: 'เกี่ยวกับเรา' },
  { href: '/faq',      label: 'คู่มือ & FAQ' },
  { href: '/contact',  label: 'ติดต่อเรา' },
]

// Quick action grid for the mobile bottom sheet
// (หน้าหลัก, ทรัพย์, สัญญา, นัดหมาย อยู่ใน bottom tab bar แล้ว ไม่ซ้ำที่นี่)
const SHEET_GRID = [
  { href: '/owners',             icon: UserCheck,  label: 'เจ้าของ',    permission: 'owner' },
  { href: '/customers',          icon: Users,       label: 'ลูกค้า',     permission: 'customer' },
  { href: '/projects',           icon: Building2,   label: 'โครงการ',    permission: 'project' },
  { href: '/co-agents',          icon: Handshake,   label: 'Co-Agent',   permission: null },
  { href: '/dashboard/activity', icon: Bell,        label: 'กิจกรรม',    permission: null },
  { href: '/commission',         icon: TrendingUp,  label: 'คอมมิชชัน',  permission: null },
  { href: '/credits',            icon: Zap,         label: 'เครดิต',     permission: null },
  { href: '/billing',            icon: CreditCard,  label: 'ชำระเงิน',   permission: null },
  { href: '/profile',            icon: Settings,    label: 'ตั้งค่า',     permission: null },
]

// Reusable avatar: shows actual image if available, else initials
function ProfileAvatar({
  profile,
  className,
  textClassName,
}: {
  profile: Profile
  className: string
  textClassName: string
}) {
  const initials = (profile.nickname || profile.name || 'U').charAt(0).toUpperCase()

  if (profile.avatar_url) {
    return (
      <div className={`${className} rounded-full overflow-hidden flex-shrink-0 relative bg-gray-100`}>
        <Image
          src={profile.avatar_url}
          alt={initials}
          fill
          className="object-cover"
          sizes="64px"
        />
      </div>
    )
  }

  return (
    <div className={`${className} bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-bold flex-shrink-0 ${textClassName}`}>
      {initials}
    </div>
  )
}

export default function Sidebar({ profile }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [sheetOpen, setSheetOpen] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)

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
      {/* ════════════════════════════════════════
          DESKTOP SIDEBAR (unchanged)
      ════════════════════════════════════════ */}
      <aside className="hidden lg:flex fixed left-0 top-0 h-full w-64 bg-white border-r border-gray-200 flex-col z-30">
        <div className="p-4 border-b border-gray-100">
          <Link href="/" className="flex items-center gap-2.5">
            <Image src="/logo/logo-icon.jpg" alt="Proppsy" width={32} height={32} className="object-contain rounded-lg flex-shrink-0" />
            <span className="font-bold text-lg text-gray-900 tracking-tight leading-none">Proppsy</span>
          </Link>
        </div>

        <div className="px-4 py-3 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <ProfileAvatar profile={profile} className="w-9 h-9" textClassName="text-sm" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-800 truncate">{profile.nickname || profile.name}</p>
              <p className="text-xs text-gray-400 truncate">{profile.position || profile.company_name || profile.email}</p>
            </div>
            <NotificationBell userId={profile.id} />
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
              <item.icon className="w-4 h-4 flex-shrink-0" />
              {item.label}
            </Link>
          ))}

          {profile.role === 'admin' && (
            <Link
              href="/admin"
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all mt-2 bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100 font-medium"
            >
              <ShieldAlert className="w-4 h-4 flex-shrink-0 text-indigo-600" />
              Admin Panel
            </Link>
          )}
        </nav>

        <div className="p-3 border-t border-gray-100 space-y-0.5">
          <Link href="/billing"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition ${isActive('/billing') ? 'bg-blue-600 text-white font-medium' : 'text-gray-600 hover:bg-gray-100'}`}>
            <CreditCard className="w-4 h-4 flex-shrink-0" />
            การชำระเงิน
          </Link>
          <Link href="/profile"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition ${isActive('/profile') ? 'bg-blue-600 text-white font-medium' : 'text-gray-600 hover:bg-gray-100'}`}>
            <Settings className="w-4 h-4 flex-shrink-0" />
            ตั้งค่า
          </Link>
          <button onClick={handleSignOut}
            className="flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-red-500 hover:bg-red-50 transition">
            <LogOut className="w-4 h-4 flex-shrink-0" /> ออกจากระบบ
          </button>
        </div>
      </aside>

      {/* ════════════════════════════════════════
          MOBILE: Top Bar
          hamburger (far left) · logo → "/" · avatar (far right)
      ════════════════════════════════════════ */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-white/95 backdrop-blur-md border-b border-gray-100 z-30 flex items-center px-4">
        {/* Hamburger — toggles small floating dropdown */}
        <button
          onClick={() => setDropdownOpen(o => !o)}
          className={`w-9 h-9 flex items-center justify-center rounded-xl transition ${
            dropdownOpen ? 'bg-gray-100 text-gray-900' : 'text-gray-600 active:bg-gray-100'
          }`}
          aria-label="เมนู"
          aria-expanded={dropdownOpen}
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Logo → homepage */}
        <Link href="/" className="flex items-center gap-2 ml-2 flex-1 min-w-0">
          <Image src="/logo/logo-icon.jpg" alt="Proppsy" width={26} height={26} className="object-contain rounded-md flex-shrink-0" />
          <span className="font-bold text-base text-gray-900 tracking-tight">Proppsy</span>
        </Link>

        {/* Notification bell */}
        <NotificationBell userId={profile.id} />

        {/* Avatar — opens bottom sheet */}
        <button
          onClick={() => setSheetOpen(true)}
          aria-label="เปิดโปรไฟล์"
          className="ml-2 active:opacity-70 transition flex-shrink-0"
        >
          <ProfileAvatar profile={profile} className="w-8 h-8" textClassName="text-sm" />
        </button>
      </div>

      {/* ── Mobile Bottom Navigation ── */}
      <MobileBottomNav profile={profile} />

      {/* ════════════════════════════════════════
          MOBILE: Hamburger dropdown backdrop (transparent)
      ════════════════════════════════════════ */}
      {dropdownOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40"
          onClick={() => setDropdownOpen(false)}
        />
      )}

      {/* ════════════════════════════════════════
          MOBILE: Floating nav dropdown
          anchored top-left below hamburger
      ════════════════════════════════════════ */}
      <div
        className={`lg:hidden fixed top-[58px] left-4 z-50 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden min-w-[190px] transition-all duration-200 origin-top-left ${
          dropdownOpen
            ? 'opacity-100 scale-100 pointer-events-auto'
            : 'opacity-0 scale-95 pointer-events-none'
        }`}
      >
        {DROPDOWN_NAV.map((item, i) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setDropdownOpen(false)}
            className={`block px-5 py-3 text-sm text-gray-700 active:bg-gray-100 transition ${
              i < DROPDOWN_NAV.length - 1 ? 'border-b border-gray-50' : ''
            } hover:bg-gray-50`}
          >
            {item.label}
          </Link>
        ))}
      </div>

      {/* ════════════════════════════════════════
          MOBILE: Bottom Sheet Backdrop
      ════════════════════════════════════════ */}
      {sheetOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
          onClick={() => setSheetOpen(false)}
        />
      )}

      {/* ════════════════════════════════════════
          MOBILE: Profile Bottom Sheet
          slides up from bottom, rounded top corners
      ════════════════════════════════════════ */}
      <div
        className={`lg:hidden fixed left-0 right-0 z-50 bg-white rounded-t-3xl shadow-2xl transition-all duration-300 ease-out overflow-hidden ${
          sheetOpen ? 'bottom-0' : '-bottom-[100%]'
        }`}
        style={{ maxHeight: '88dvh' }}
      >
        {/* Pull handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>

        <div className="overflow-y-auto" style={{ maxHeight: 'calc(88dvh - 28px)' }}>
          {/* ── Profile card ── */}
          <div className="flex items-center gap-4 px-5 py-3">
            <ProfileAvatar profile={profile} className="w-14 h-14" textClassName="text-xl" />
            <div className="min-w-0 flex-1">
              <p className="font-bold text-gray-900 text-base leading-tight truncate">
                {profile.nickname || profile.name}
              </p>
              <p className="text-sm text-gray-400 truncate mt-0.5">
                {profile.position || profile.company_name || profile.email}
              </p>
              {profile.role === 'admin' && (
                <span className="inline-block mt-1.5 text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full">
                  Admin
                </span>
              )}
            </div>
            <Link
              href="/profile"
              onClick={() => setSheetOpen(false)}
              className="w-9 h-9 flex items-center justify-center text-gray-400 bg-gray-50 active:bg-gray-100 rounded-xl transition flex-shrink-0"
              aria-label="ไปหน้าตั้งค่า"
            >
              <Settings className="w-4.5 h-4.5 w-[18px] h-[18px]" />
            </Link>
          </div>

          <div className="h-px bg-gray-100 mx-5 mb-4 mt-1" />

          {/* ── Quick nav grid (3 columns) ── */}
          <div className="px-4 mb-4">
            <div className="grid grid-cols-3 gap-2">
              {SHEET_GRID.filter(item => hasPermission(item.permission)).map(item => {
                const Icon = item.icon
                const active = isActive(item.href)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setSheetOpen(false)}
                    className={`flex flex-col items-center gap-1.5 py-3.5 rounded-2xl transition active:scale-95 ${
                      active
                        ? 'bg-blue-50 text-blue-600'
                        : 'bg-gray-50 text-gray-600 active:bg-gray-100'
                    }`}
                  >
                    <Icon className={`w-[22px] h-[22px] ${active ? 'text-blue-600' : 'text-gray-500'}`} />
                    <span className={`text-[11px] font-medium leading-none ${active ? 'text-blue-600' : 'text-gray-600'}`}>
                      {item.label}
                    </span>
                  </Link>
                )
              })}
            </div>
          </div>

          {/* ── Admin Panel link (admin only) ── */}
          {profile.role === 'admin' && (
            <div className="px-4 mb-3">
              <Link
                href="/admin"
                onClick={() => setSheetOpen(false)}
                className="flex items-center gap-3 px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-700 active:bg-slate-100 transition active:scale-95"
              >
                <ShieldAlert className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                <span className="text-sm font-semibold flex-1">Admin Panel</span>
                <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
              </Link>
            </div>
          )}

          {/* ── Logout ── */}
          <div className="px-4 pb-10">
            <button
              onClick={handleSignOut}
              className="w-full flex items-center justify-center gap-2.5 py-3.5 bg-red-50 text-red-500 rounded-2xl text-sm font-semibold active:bg-red-100 transition active:scale-95"
            >
              <LogOut className="w-4 h-4" />
              ออกจากระบบ
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
