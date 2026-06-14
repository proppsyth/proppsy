import Link from 'next/link'
import Image from 'next/image'
import { Menu } from 'lucide-react'
import NavAuthButtons from './NavAuthButtons'
import NavMobileMenu from './NavMobileMenu'

const NAV_LINKS = [
  { href: '/services', label: 'บริการ' },
  { href: '/news', label: 'ข่าวสาร' },
  { href: '/about', label: 'เกี่ยวกับเรา' },
  { href: '/help', label: 'คู่มือ & FAQ' },
  { href: '/contact', label: 'ติดต่อเรา' },
]

// Sync Server Component — no async/await, no auth check here.
// Auth state is handled client-side by NavAuthButtons to avoid SSR hydration mismatch.
export default function PublicNav() {
  return (
    <nav className="bg-white border-b border-gray-100 sticky top-0 z-30 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-2">

        {/* Mobile hamburger — client component to avoid <details> hydration issues */}
        <NavMobileMenu links={NAV_LINKS} />

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 flex-shrink-0">
          <Image src="/logo/logo-icon.jpg" alt="Proppsy" width={28} height={28} className="object-contain rounded-lg" />
          <span className="font-bold text-lg text-gray-900">Proppsy</span>
        </Link>

        {/* Desktop nav links (center) */}
        <div className="hidden md:flex items-center gap-5 text-sm text-gray-600 flex-1 justify-center">
          {NAV_LINKS.map(l => (
            <Link key={l.href} href={l.href} className="hover:text-gray-900 transition whitespace-nowrap">
              {l.label}
            </Link>
          ))}
        </div>

        {/* Auth buttons — client-side to prevent hydration mismatch */}
        <div className="flex items-center gap-1.5 ml-auto">
          <NavAuthButtons />
        </div>

      </div>
    </nav>
  )
}
