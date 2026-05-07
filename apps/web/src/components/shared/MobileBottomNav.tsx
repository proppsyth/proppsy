'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, Home, FileText, Calendar, Plus, X,
  Users, UserCheck, Building2, TrendingUp, Settings,
  LogOut, ClipboardList, ChevronRight,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types'

interface Props {
  profile: Profile
}

const TABS = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'หน้าหลัก' },
  { href: '/stock', icon: Home, label: 'ทรัพย์' },
  null, // center FAB
  { href: '/contracts', icon: FileText, label: 'สัญญา' },
  { href: '/calendar', icon: Calendar, label: 'ปฏิทิน' },
]

const QUICK_ADD = [
  { href: '/stock/new', label: 'เพิ่มทรัพย์ใหม่', icon: Home, color: 'bg-blue-500', sub: 'บันทึกข้อมูลทรัพย์' },
  { href: '/appointments/new', label: 'นัดหมายใหม่', icon: ClipboardList, color: 'bg-green-500', sub: 'วางแผนนัดหมาย' },
  { href: '/contracts/new', label: 'สร้างสัญญา', icon: FileText, color: 'bg-purple-500', sub: 'ร่างสัญญาด้วย wizard' },
]

const MORE_ITEMS = [
  { href: '/owners', icon: UserCheck, label: 'เจ้าของทรัพย์' },
  { href: '/customers', icon: Users, label: 'ลูกค้า' },
  { href: '/projects', icon: Building2, label: 'โครงการ' },
  { href: '/appointments', icon: ClipboardList, label: 'นัดหมาย' },
  { href: '/commission', icon: TrendingUp, label: 'คอมมิชชัน' },
  { href: '/profile', icon: Settings, label: 'โปรไฟล์' },
]

export default function MobileBottomNav({ profile }: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const [sheet, setSheet] = useState<'add' | 'more' | null>(null)

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const isActive = (href: string) =>
    href === '/dashboard' ? pathname === href : pathname.startsWith(href)

  const closeSheet = () => setSheet(null)

  return (
    <>
      {/* ── Bottom Tab Bar ── */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur border-t border-gray-100 safe-area-bottom">
        <div className="flex items-center h-16 px-1">
          {TABS.map((tab, i) => {
            if (!tab) {
              return (
                <div key="fab" className="flex-1 flex justify-center">
                  <button
                    onClick={() => setSheet(s => s === 'add' ? null : 'add')}
                    className={`w-13 h-13 w-[52px] h-[52px] rounded-2xl flex items-center justify-center shadow-lg transition-all ${
                      sheet === 'add' ? 'bg-gray-800 rotate-45' : 'bg-blue-600'
                    }`}
                  >
                    <Plus className="w-6 h-6 text-white" />
                  </button>
                </div>
              )
            }

            const Icon = tab.icon
            const active = isActive(tab.href)

            return (
              <Link
                key={tab.href}
                href={tab.href}
                className="flex-1 flex flex-col items-center gap-0.5 py-2 transition-all"
              >
                <Icon className={`w-5 h-5 transition-colors ${active ? 'text-blue-600' : 'text-gray-400'}`} />
                <span className={`text-[10px] font-medium transition-colors ${active ? 'text-blue-600' : 'text-gray-400'}`}>
                  {tab.label}
                </span>
                {active && <span className="absolute bottom-1.5 w-1 h-1 rounded-full bg-blue-600" />}
              </Link>
            )
          })}

          {/* More tab */}
          <button
            onClick={() => setSheet(s => s === 'more' ? null : 'more')}
            className="flex-1 flex flex-col items-center gap-0.5 py-2"
          >
            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors ${
              sheet === 'more' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'
            }`}>
              {(profile.nickname || profile.name || 'U').charAt(0).toUpperCase()}
            </div>
            <span className={`text-[10px] font-medium ${sheet === 'more' ? 'text-blue-600' : 'text-gray-400'}`}>
              เพิ่มเติม
            </span>
          </button>
        </div>
      </nav>

      {/* ── Backdrop ── */}
      {sheet && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
          onClick={closeSheet}
        />
      )}

      {/* ── Quick Add Sheet ── */}
      <div className={`lg:hidden fixed left-0 right-0 z-50 bg-white rounded-t-3xl shadow-xl transition-all duration-300 ease-out ${
        sheet === 'add' ? 'bottom-0' : '-bottom-full'
      }`}>
        <div className="px-5 pt-5 pb-safe pb-8">
          {/* Handle */}
          <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />

          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-gray-900">เพิ่มใหม่</h3>
            <button onClick={closeSheet} className="p-1.5 rounded-full bg-gray-100 text-gray-500">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-2.5">
            {QUICK_ADD.map(item => {
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={closeSheet}
                  className="flex items-center gap-4 p-4 bg-gray-50 active:bg-gray-100 rounded-2xl transition"
                >
                  <div className={`w-12 h-12 ${item.color} rounded-2xl flex items-center justify-center flex-shrink-0`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm">{item.label}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{item.sub}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
                </Link>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── More Sheet ── */}
      <div className={`lg:hidden fixed left-0 right-0 z-50 bg-white rounded-t-3xl shadow-xl transition-all duration-300 ease-out ${
        sheet === 'more' ? 'bottom-0' : '-bottom-full'
      }`}>
        <div className="px-5 pt-5 pb-safe pb-8">
          {/* Handle */}
          <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />

          {/* Profile */}
          <div className="flex items-center gap-3 mb-5 p-4 bg-gray-50 rounded-2xl">
            <div className="w-11 h-11 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-bold flex-shrink-0">
              {(profile.nickname || profile.name || 'U').charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-gray-900 text-sm truncate">{profile.nickname || profile.name}</p>
              <p className="text-xs text-gray-400 truncate">{profile.position || profile.company_name || profile.email}</p>
            </div>
            <Link href="/profile" onClick={closeSheet}>
              <Settings className="w-4 h-4 text-gray-400" />
            </Link>
          </div>

          {/* More nav grid */}
          <div className="grid grid-cols-3 gap-2.5 mb-5">
            {MORE_ITEMS.map(item => {
              const Icon = item.icon
              const active = isActive(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={closeSheet}
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

          {/* Sign out */}
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
