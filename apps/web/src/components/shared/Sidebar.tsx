'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
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
  { href: '/appointments', icon: '🗓️', label: 'นัดหมาย', permission: null },
  { href: '/calendar', icon: '📅', label: 'ปฏิทิน', permission: null },
  { href: '/commission', icon: '💰', label: 'คอมมิชชัน', permission: null },
]

const ADMIN_ITEMS = [
  { href: '/admin/users', icon: '👑', label: 'จัดการผู้ใช้' },
  { href: '/admin/news', icon: '📰', label: 'จัดการข่าว' },
]

export default function Sidebar({ profile }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const isActive = (href: string) =>
    href === '/dashboard' ? pathname === href : pathname.startsWith(href)

  const hasPermission = (permission: string | null) => {
    if (!permission) return true
    if (profile.role === 'admin') return true
    return profile.permissions?.[permission as keyof typeof profile.permissions] ?? false
  }

  return (
    <>
      {/* ── Desktop Sidebar ── */}
      <aside className="hidden lg:flex fixed left-0 top-0 h-full w-64 bg-white border-r border-gray-200 flex-col z-30">
        {/* Logo */}
        <div className="p-5 border-b border-gray-100">
          <Image src="/logo/logo.png" alt="Proppsy" width={120} height={40} className="object-contain" />
        </div>

        {/* Profile mini */}
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

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.filter(item => hasPermission(item.permission)).map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                isActive(item.href)
                  ? 'bg-blue-600 text-white font-medium'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <span className="text-base">{item.icon}</span>
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
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                    isActive(item.href)
                      ? 'bg-blue-600 text-white font-medium'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <span className="text-base">{item.icon}</span>
                  {item.label}
                </Link>
              ))}
            </>
          )}
        </nav>

        {/* Bottom actions */}
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

      {/* ── Mobile: slim top bar ── */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-white/95 backdrop-blur border-b border-gray-100 flex items-center px-4 z-30">
        <Image src="/logo/logo.png" alt="Proppsy" width={90} height={30} className="object-contain" />
      </div>

      {/* Mobile spacer for top bar */}
      <div className="lg:hidden h-14" />

      {/* ── Mobile Bottom Navigation ── */}
      <MobileBottomNav profile={profile} />
    </>
  )
}
