'use client'

import { useState } from 'react'
import Link from 'next/link'
import NextImage from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, Users, Building2, Coins, Package, Receipt,
  FileText, FileCode, MapPin, Newspaper, BookOpen, Image as GalleryIcon,
  HelpCircle, BarChart3, ScrollText, Settings, LogOut, Menu, X, ArrowLeft,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types'

interface AdminSidebarProps {
  profile: Profile
}

const NAV_SECTIONS = [
  {
    label: 'ภาพรวม',
    items: [
      { href: '/admin', icon: LayoutDashboard, label: 'แดชบอร์ด', exact: true },
      { href: '/admin/analytics', icon: BarChart3, label: 'Analytics' },
    ],
  },
  {
    label: 'ผู้ใช้งาน',
    items: [
      { href: '/admin/users', icon: Users, label: 'ผู้ใช้' },
      { href: '/admin/companies', icon: Building2, label: 'บริษัท / ทีม' },
    ],
  },
  {
    label: 'การเงิน',
    items: [
      { href: '/admin/credits', icon: Coins, label: 'เครดิต' },
      { href: '/admin/packages', icon: Package, label: 'แพ็กเกจ' },
      { href: '/admin/billing', icon: Receipt, label: 'Billing' },
    ],
  },
  {
    label: 'ระบบทรัพย์สิน',
    items: [
      { href: '/admin/contracts', icon: FileText, label: 'สัญญา' },
      { href: '/admin/templates', icon: FileCode, label: 'เทมเพลต' },
      { href: '/admin/projects', icon: MapPin, label: 'โครงการ' },
    ],
  },
  {
    label: 'เนื้อหา',
    items: [
      { href: '/admin/news', icon: Newspaper, label: 'ข่าวสาร' },
      { href: '/admin/articles', icon: BookOpen, label: 'บทความ' },
      { href: '/admin/banners', icon: GalleryIcon, label: 'แบนเนอร์' },
      { href: '/admin/faq', icon: HelpCircle, label: 'FAQ & คู่มือ' },
    ],
  },
  {
    label: 'ระบบ',
    items: [
      { href: '/admin/logs', icon: ScrollText, label: 'System Logs' },
      { href: '/admin/settings', icon: Settings, label: 'ตั้งค่า' },
    ],
  },
]

function NavItems({
  pathname,
  onClose,
}: {
  pathname: string
  onClose?: () => void
}) {
  const isActive = (href: string, exact = false) => {
    if (exact) return pathname === href
    return pathname === href || pathname.startsWith(href + '/')
  }

  return (
    <div className="space-y-4">
      {NAV_SECTIONS.map((section) => (
        <div key={section.label}>
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest px-3 mb-1">
            {section.label}
          </p>
          <div className="space-y-0.5">
            {section.items.map((item) => {
              const Icon = item.icon
              const active = isActive(item.href, item.exact)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${
                    active
                      ? 'bg-indigo-600 text-white font-medium'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
                  }`}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  {item.label}
                </Link>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

export default function AdminSidebar({ profile }: AdminSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const initials = (profile.nickname || profile.name || 'A').charAt(0).toUpperCase()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <>
      {/* ── Desktop Sidebar ── */}
      <aside className="hidden lg:flex fixed left-0 top-0 h-full w-64 bg-slate-900 flex-col z-30">
        {/* Logo */}
        <div className="px-4 py-4 border-b border-slate-800 flex-shrink-0">
          <Link href="/admin" className="flex items-center gap-2.5">
            <NextImage
              src="/logo/logo-icon.jpg"
              alt="Proppsy"
              width={28}
              height={28}
              className="object-contain rounded-lg flex-shrink-0"
            />
            <div>
              <p className="font-bold text-sm text-white leading-none">Proppsy</p>
              <p className="text-[11px] text-indigo-400 mt-0.5">Admin Panel</p>
            </div>
          </Link>
        </div>

        {/* Profile */}
        <div className="px-4 py-3 border-b border-slate-800 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-indigo-500/20 rounded-full flex items-center justify-center text-indigo-400 font-semibold text-xs flex-shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-200 truncate">
                {profile.nickname || profile.name}
              </p>
              <p className="text-[11px] text-indigo-400 font-medium">แอดมิน</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto">
          <NavItems pathname={pathname} />
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-slate-800 flex-shrink-0 space-y-0.5">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition"
          >
            <ArrowLeft className="w-4 h-4 flex-shrink-0" />
            กลับ Workspace
          </Link>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-red-400 hover:bg-red-900/20 hover:text-red-300 transition"
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            ออกจากระบบ
          </button>
        </div>
      </aside>

      {/* ── Mobile Top Bar ── */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-slate-900 border-b border-slate-800 z-30 flex items-center px-4 gap-3">
        <button
          onClick={() => setOpen(true)}
          className="w-8 h-8 flex items-center justify-center text-slate-400 active:bg-slate-800 rounded-lg transition"
          aria-label="เปิดเมนู"
        >
          <Menu className="w-5 h-5" />
        </button>
        <Link href="/admin" className="flex items-center gap-2 flex-1">
          <NextImage
            src="/logo/logo-icon.jpg"
            alt="Proppsy"
            width={22}
            height={22}
            className="object-contain rounded-md flex-shrink-0"
          />
          <span className="font-bold text-sm text-white">Admin</span>
        </Link>
        <div className="w-8 h-8 bg-indigo-500/20 rounded-full flex items-center justify-center text-indigo-400 text-xs font-bold">
          {initials}
        </div>
      </div>

      {/* ── Mobile Backdrop ── */}
      {open && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />
      )}

      {/* ── Mobile Drawer ── */}
      <div
        className={`lg:hidden fixed top-0 left-0 bottom-0 w-72 bg-slate-900 z-50 shadow-2xl flex flex-col transition-transform duration-300 ease-out ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between px-4 h-14 border-b border-slate-800 flex-shrink-0">
          <Link href="/admin" className="flex items-center gap-2.5" onClick={() => setOpen(false)}>
            <NextImage
              src="/logo/logo-icon.jpg"
              alt="Proppsy"
              width={22}
              height={22}
              className="object-contain rounded-md flex-shrink-0"
            />
            <span className="font-bold text-sm text-white">Admin Panel</span>
          </Link>
          <button
            onClick={() => setOpen(false)}
            className="w-8 h-8 flex items-center justify-center text-slate-400 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Drawer profile */}
        <div className="px-4 py-3 border-b border-slate-800 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-indigo-500/20 rounded-full flex items-center justify-center text-indigo-400 font-semibold text-xs flex-shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-200 truncate">
                {profile.nickname || profile.name}
              </p>
              <p className="text-[11px] text-indigo-400 font-medium">แอดมิน</p>
            </div>
          </div>
        </div>

        {/* Drawer nav */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto">
          <NavItems pathname={pathname} onClose={() => setOpen(false)} />
        </nav>

        {/* Drawer footer */}
        <div className="p-3 border-t border-slate-800 flex-shrink-0 space-y-0.5">
          <Link
            href="/dashboard"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition"
          >
            <ArrowLeft className="w-4 h-4 flex-shrink-0" />
            กลับ Workspace
          </Link>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-red-400 hover:bg-red-900/20 hover:text-red-300 transition"
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            ออกจากระบบ
          </button>
        </div>
      </div>
    </>
  )
}
