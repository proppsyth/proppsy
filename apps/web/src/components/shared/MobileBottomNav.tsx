'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Home, FileText, Calendar, Plus, X,
  ClipboardList, ChevronRight,
} from 'lucide-react'
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

export default function MobileBottomNav({ profile: _ }: Props) {
  const pathname = usePathname()
  const [addOpen, setAddOpen] = useState(false)

  const isActive = (href: string) =>
    href === '/dashboard' ? pathname === href : pathname.startsWith(href)

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
                    onClick={() => setAddOpen(s => !s)}
                    className={`w-[52px] h-[52px] rounded-2xl flex items-center justify-center shadow-lg transition-all active:scale-95 ${
                      addOpen ? 'bg-gray-800 rotate-45' : 'bg-blue-600'
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
        </div>
      </nav>

      {/* ── Backdrop ── */}
      {addOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
          onClick={() => setAddOpen(false)}
        />
      )}

      {/* ── Quick Add Sheet ── */}
      <div className={`lg:hidden fixed left-0 right-0 z-50 bg-white rounded-t-3xl shadow-xl transition-all duration-300 ease-out ${
        addOpen ? 'bottom-0' : '-bottom-full'
      }`}>
        <div className="px-5 pt-5 pb-safe pb-8">
          <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />

          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-gray-900">เพิ่มใหม่</h3>
            <button onClick={() => setAddOpen(false)} className="p-1.5 rounded-full bg-gray-100 text-gray-500">
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
                  onClick={() => setAddOpen(false)}
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
    </>
  )
}
