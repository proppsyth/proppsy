import Link from 'next/link'
import Image from 'next/image'

export default function PublicFooter() {
  return (
    <footer className="border-t border-gray-100 py-8">
      <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-400">
        <div className="flex items-center gap-2">
          <Image src="/logo/logo-icon.jpg" alt="Proppsy" width={20} height={20} className="object-contain rounded" />
          <span>© {new Date().getFullYear()} Proppsy · Real Estate Management Platform</span>
        </div>
        <div className="flex items-center gap-4 flex-wrap justify-center sm:justify-end">
          <Link href="/listing" className="hover:text-gray-600 transition">ทรัพย์สิน</Link>
          <Link href="/help" className="hover:text-gray-600 transition">คู่มือ</Link>
          <Link href="/faq" className="hover:text-gray-600 transition">FAQ</Link>
          <Link href="/services" className="hover:text-gray-600 transition">บริการ</Link>
          <Link href="/news" className="hover:text-gray-600 transition">ข่าวสาร</Link>
          <Link href="/about" className="hover:text-gray-600 transition">เกี่ยวกับเรา</Link>
          <Link href="/contact" className="hover:text-gray-600 transition">ติดต่อเรา</Link>
          <Link href="/terms" className="hover:text-gray-600 transition">ข้อกำหนด</Link>
          <Link href="/privacy" className="hover:text-gray-600 transition">ความเป็นส่วนตัว</Link>
        </div>
      </div>
    </footer>
  )
}
