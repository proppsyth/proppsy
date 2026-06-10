import type { Metadata } from 'next'
import PublicNav from '@/components/shared/PublicNav'
import PublicFooter from '@/components/shared/PublicFooter'
import { TERMS_SECTIONS } from '@/lib/legal/terms-content'

export const metadata: Metadata = {
  title: 'ข้อกำหนดการใช้งาน — Proppsy',
  description: 'ข้อกำหนดและเงื่อนไขการใช้งานแพลตฟอร์ม Proppsy สำหรับเอเจนต์อสังหาริมทรัพย์',
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <PublicNav />

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">ข้อกำหนดการใช้งาน</h1>
          <p className="text-sm text-gray-500">มีผลบังคับใช้ตั้งแต่ วันที่ 1 มกราคม 2568</p>
        </div>

        <div className="space-y-8">
          {TERMS_SECTIONS.map((section) => (
            <section key={section.title}>
              <h2 className="text-base font-semibold text-gray-800 mb-3">{section.title}</h2>
              <div className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{section.body}</div>
            </section>
          ))}
        </div>

        <div className="mt-10 pt-6 border-t border-gray-100 text-xs text-gray-400 space-y-1">
          <p>หากมีคำถามเกี่ยวกับข้อกำหนดการใช้งาน กรุณาติดต่อ</p>
          <p>
            <a href="mailto:proppsyth@gmail.com" className="text-blue-600 hover:underline">proppsyth@gmail.com</a>
          </p>
        </div>
      </main>

      <PublicFooter />
    </div>
  )
}
