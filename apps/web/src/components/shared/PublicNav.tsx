import Link from 'next/link'
import Image from 'next/image'
import { Menu } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'

const NAV_LINKS = [
  { href: '/services', label: 'บริการ' },
  { href: '/news', label: 'ข่าวสาร' },
  { href: '/about', label: 'เกี่ยวกับเรา' },
  { href: '/contact', label: 'ติดต่อเรา' },
]

export default async function PublicNav() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <nav className="bg-white border-b border-gray-100 sticky top-0 z-10 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-2">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 flex-shrink-0">
          <Image src="/logo/logo-icon.jpg" alt="Proppsy" width={28} height={28} className="object-contain rounded-lg" />
          <span className="font-bold text-lg text-gray-900">Proppsy</span>
        </Link>

        {/* Desktop nav links */}
        <div className="hidden md:flex items-center gap-5 text-sm text-gray-600 flex-1 justify-center">
          {NAV_LINKS.map(l => (
            <Link key={l.href} href={l.href} className="hover:text-gray-900 transition whitespace-nowrap">
              {l.label}
            </Link>
          ))}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-1.5">
          {/* Mobile hamburger */}
          <details className="relative md:hidden">
            <summary className="list-none cursor-pointer w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-100 transition select-none">
              <Menu className="w-5 h-5 text-gray-600" />
            </summary>
            <div className="absolute right-0 top-full mt-2 w-44 bg-white rounded-xl shadow-lg border border-gray-100 py-1.5 z-50">
              {NAV_LINKS.map(l => (
                <Link key={l.href} href={l.href}
                  className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition">
                  {l.label}
                </Link>
              ))}
              {!user && (
                <>
                  <div className="my-1 border-t border-gray-100" />
                  <Link href="/login" className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition">
                    ลงชื่อเข้าใช้
                  </Link>
                </>
              )}
            </div>
          </details>

          {user ? (
            <Link href="/dashboard" className="px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition">
              แดชบอร์ด
            </Link>
          ) : (
            <>
              <Link href="/login" className="text-sm text-gray-600 hover:text-gray-900 transition px-2 py-1.5 hidden sm:inline">
                ลงชื่อเข้าใช้
              </Link>
              <Link href="/register" className="px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition whitespace-nowrap">
                ลงทะเบียน
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}
