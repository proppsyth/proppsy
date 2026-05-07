import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, Building2, Users, FileText, TrendingUp } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'เกี่ยวกับเรา — Proppsy' }

export default function AboutPage() {
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
            <Link href="/contact" className="hover:text-gray-900 transition hidden sm:block">ติดต่อเรา</Link>
            <Link href="/login" className="px-4 py-1.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition">
              เข้าสู่ระบบ
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <Link href="/" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition mb-6 w-fit">
          <ArrowLeft className="w-4 h-4" />
          กลับหน้าหลัก
        </Link>

        {/* Hero */}
        <div className="bg-gradient-to-br from-blue-700 to-indigo-800 text-white rounded-2xl p-8 mb-8 text-center">
          <div className="flex justify-center mb-4">
            <Image src="/logo/logo-icon.jpg" alt="Proppsy" width={64} height={64} className="object-contain rounded-2xl" />
          </div>
          <h1 className="text-3xl font-bold mb-3">เกี่ยวกับ Proppsy</h1>
          <p className="text-blue-200 max-w-xl mx-auto leading-relaxed">
            แพลตฟอร์มจัดการอสังหาริมทรัพย์สำหรับเอเจนต์มืออาชีพในประเทศไทย
            ออกแบบมาเพื่อลดงานซ้ำซ้อน เพิ่มความเร็วในการทำงาน
          </p>
        </div>

        {/* Features */}
        <div className="grid sm:grid-cols-2 gap-4 mb-8">
          {[
            { icon: Building2, title: 'จัดการทรัพย์สิน', desc: 'บันทึกทรัพย์ รูปภาพ รายละเอียดครบ พร้อม AI ช่วยกรอกข้อมูลอัตโนมัติ' },
            { icon: Users, title: 'จัดการเจ้าของ & ลูกค้า', desc: 'เก็บข้อมูลผู้ติดต่อ บัตรประชาชน และประวัติการทำงาน' },
            { icon: FileText, title: 'สร้างสัญญาครบชุด', desc: 'สร้างเอกสาร 9 ประเภทใน PDF ไฟล์เดียว พร้อม AI OCR' },
            { icon: TrendingUp, title: 'ติดตามคอมมิชชัน', desc: 'ดูรายได้รายเดือน รายปี พร้อมกราฟและสถิติ' },
          ].map(f => (
            <div key={f.title} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center mb-3">
                <f.icon className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">{f.title}</h3>
              <p className="text-sm text-gray-500">{f.desc}</p>
            </div>
          ))}
        </div>

        {/* Mission */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 mb-8">
          <h2 className="text-lg font-bold text-gray-900 mb-3">พันธกิจของเรา</h2>
          <p className="text-gray-600 leading-relaxed text-sm">
            Proppsy ถูกสร้างขึ้นเพื่อเอเจนต์อสังหาริมทรัพย์ในประเทศไทย
            เราเชื่อว่างานเอกสารและการจัดการข้อมูลไม่ควรใช้เวลาเกินจำเป็น
            เอเจนต์ควรมีเวลามากขึ้นในการดูแลลูกค้าและปิดดีล
          </p>
          <p className="text-gray-600 leading-relaxed text-sm mt-3">
            ด้วย AI ที่ช่วยกรอกข้อมูลจากภาพ ระบบสร้างสัญญาอัตโนมัติ
            และ Public Marketplace ที่ช่วยให้ทรัพย์ถูกพบเจอมากขึ้น
            เราพัฒนา Proppsy ให้เป็นเครื่องมือที่ทำให้ชีวิตเอเจนต์ง่ายขึ้นทุกวัน
          </p>
        </div>

        {/* CTA */}
        <div className="text-center">
          <Link href="/register" className="inline-block px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition">
            เริ่มใช้งานฟรี
          </Link>
          <p className="text-xs text-gray-400 mt-3">สมัครเป็นเอเจนต์ รอการอนุมัติจากแอดมิน</p>
        </div>
      </div>

      <footer className="border-t border-gray-100 mt-8 py-6 text-center text-xs text-gray-400">
        © {new Date().getFullYear()} Proppsy · Real Estate Management Platform
      </footer>
    </div>
  )
}
