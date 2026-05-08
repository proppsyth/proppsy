import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'

export default async function PublicNav() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <nav className="bg-white border-b border-gray-100 sticky top-0 z-10 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
        <Link href="/" className="flex items-center gap-2 flex-shrink-0">
          <Image src="/logo/logo-icon.jpg" alt="Proppsy" width={28} height={28} className="object-contain rounded-lg" />
          <span className="font-bold text-lg text-gray-900">Proppsy</span>
        </Link>

        <div className="hidden md:flex items-center gap-5 text-sm text-gray-600">
          <Link href="/services" className="hover:text-gray-900 transition">บริการ</Link>
          <Link href="/news" className="hover:text-gray-900 transition">ข่าวสาร</Link>
          <Link href="/about" className="hover:text-gray-900 transition">เกี่ยวกับเรา</Link>
          <Link href="/contact" className="hover:text-gray-900 transition">ติดต่อเรา</Link>
        </div>

        <div className="flex items-center gap-2">
          {user ? (
            <Link href="/dashboard" className="px-4 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition">
              แดชบอร์ด
            </Link>
          ) : (
            <>
              <Link href="/login" className="text-sm text-gray-600 hover:text-gray-900 transition px-2 py-1.5 hidden sm:inline">
                ลงชื่อเข้าใช้
              </Link>
              <Link href="/register" className="px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition">
                ลงทะเบียน
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}
