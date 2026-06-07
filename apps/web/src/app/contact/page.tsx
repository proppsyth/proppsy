import Link from 'next/link'
import { ArrowLeft, Mail, Phone, MessageCircle, MapPin, Clock } from 'lucide-react'
import type { Metadata } from 'next'
import PublicNav from '@/components/shared/PublicNav'
import PublicFooter from '@/components/shared/PublicFooter'

export const metadata: Metadata = { title: 'ติดต่อเรา — Proppsy' }

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <PublicNav />

      <div className="max-w-2xl mx-auto px-4 py-8">
        <Link href="/" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition mb-6 w-fit">
          <ArrowLeft className="w-4 h-4" />
          กลับหน้าหลัก
        </Link>

        <h1 className="text-2xl font-bold text-gray-900 mb-1">ติดต่อเรา</h1>
        <p className="text-gray-500 text-sm mb-8">มีคำถามหรือต้องการสาธิต? เราพร้อมช่วยเสมอ</p>

        <div className="space-y-4 mb-8">
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
              <Clock className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">เวลาทำการ</p>
              <p className="text-sm text-gray-600">จันทร์–ศุกร์ 9:00–18:00 น.</p>
              <p className="text-xs text-gray-400 mt-0.5">นอกเวลาทำการตอบกลับทาง LINE / อีเมล</p>
            </div>
          </div>

          <div className="flex items-center gap-4 bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center flex-shrink-0">
              <MapPin className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">ที่ตั้ง</p>
              <p className="text-sm text-gray-600">กรุงเทพมหานคร ประเทศไทย</p>
              <p className="text-xs text-gray-400 mt-0.5">ให้บริการออนไลน์ทั่วประเทศ</p>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 rounded-xl p-5">
          <h2 className="font-semibold text-gray-900 mb-2">ลงทะเบียนใช้งาน Proppsy</h2>
          <p className="text-sm text-gray-600 mb-4">
            ต้องการใช้งาน Proppsy? สมัครได้เลย รอการอนุมัติจากแอดมินภายใน 1 วันทำการ
          </p>
          <div className="flex gap-3 flex-wrap">
            <Link href="/register" className="inline-block px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition">
              ลงทะเบียน
            </Link>
            <Link href="/services" className="inline-block px-6 py-2.5 border border-blue-300 text-blue-700 text-sm font-medium rounded-xl hover:bg-blue-100 transition">
              ดูแพ็กเกจราคา
            </Link>
          </div>
        </div>
      </div>

      <PublicFooter />
    </div>
  )
}
