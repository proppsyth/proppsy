import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, Mail, Phone, MessageCircle } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'ติดต่อเรา — Proppsy' }

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-100 sticky top-0 z-10 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/logo/logo-icon.jpg" alt="Proppsy" width={28} height={28} className="object-contain rounded-lg" />
            <span className="font-bold text-lg text-gray-900">Proppsy</span>
          </Link>
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <Link href="/news" className="hover:text-gray-900 transition hidden sm:block">ข่าวสาร</Link>
            <Link href="/about" className="hover:text-gray-900 transition hidden sm:block">เกี่ยวกับเรา</Link>
            <Link href="/login" className="px-4 py-1.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition">
              เข้าสู่ระบบ
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-4 py-8">
        <Link href="/" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition mb-6 w-fit">
          <ArrowLeft className="w-4 h-4" />
          กลับหน้าหลัก
        </Link>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">ติดต่อเรา</h1>
        <p className="text-gray-500 text-sm mb-8">มีคำถาม? เราพร้อมช่วยเสมอ</p>

        <div className="space-y-4">
          <a
            href="mailto:proppsyth@gmail.com"
            className="flex items-center gap-4 bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition"
          >
            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
              <Mail className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">อีเมล</p>
              <p className="text-sm text-blue-600">proppsyth@gmail.com</p>
              <p className="text-xs text-gray-400 mt-0.5">ตอบกลับภายใน 24 ชั่วโมง</p>
            </div>
          </a>

          <a
            href="https://line.me/ti/p/~proppsyth"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-4 bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition"
          >
            <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center flex-shrink-0">
              <MessageCircle className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">LINE</p>
              <p className="text-sm text-green-600">@proppsyth</p>
              <p className="text-xs text-gray-400 mt-0.5">สำหรับการสนับสนุนด่วน</p>
            </div>
          </a>

          <div className="flex items-center gap-4 bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center flex-shrink-0">
              <Phone className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">โทรศัพท์</p>
              <p className="text-sm text-gray-500">ติดต่อผ่านอีเมลหรือ LINE</p>
              <p className="text-xs text-gray-400 mt-0.5">จันทร์–ศุกร์ 9:00–18:00 น.</p>
            </div>
          </div>
        </div>

        <div className="mt-8 bg-blue-50 rounded-xl p-5">
          <h2 className="font-semibold text-gray-900 mb-2">สมัครเป็นเอเจนต์</h2>
          <p className="text-sm text-gray-600 mb-4">
            ต้องการใช้งาน Proppsy? สมัครได้เลย รอการอนุมัติจากแอดมินภายใน 1 วันทำการ
          </p>
          <Link href="/register" className="inline-block px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition">
            สมัครเลย
          </Link>
        </div>
      </div>

      <footer className="border-t border-gray-100 mt-8 py-6 text-center text-xs text-gray-400">
        © {new Date().getFullYear()} Proppsy · Real Estate Management Platform
      </footer>
    </div>
  )
}
