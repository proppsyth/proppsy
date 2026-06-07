import type { Metadata } from 'next'
import Link from 'next/link'
import { HelpCircle, MessageCircle, BookOpen, ArrowLeft } from 'lucide-react'
import PublicNav from '@/components/shared/PublicNav'
import PublicFooter from '@/components/shared/PublicFooter'
import { createServiceClient } from '@/lib/supabase/server'
import FaqSearch from './FaqSearch'
import type { FaqItem } from './FaqSearch'

export const metadata: Metadata = {
  title: 'ศูนย์ช่วยเหลือ — Proppsy',
  description: 'ค้นหาคำตอบสำหรับคำถามที่พบบ่อยเกี่ยวกับ Proppsy แพลตฟอร์มจัดการอสังหาริมทรัพย์',
}

const CATEGORY_ORDER = ['general', 'account', 'listing', 'contract', 'payment']

export default async function FaqPage() {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('faq')
    .select('id, question, answer, category, sort_order')
    .eq('is_published', true)
    .order('category')
    .order('sort_order')

  const items = (data ?? []) as FaqItem[]

  // Build ordered category list
  const allCats = [...new Set(items.map(i => i.category ?? 'general'))]
  const categories = [
    ...CATEGORY_ORDER.filter(c => allCats.includes(c)),
    ...allCats.filter(c => !CATEGORY_ORDER.includes(c)).sort(),
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <PublicNav />

      {/* Hero */}
      <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white">
        <div className="max-w-3xl mx-auto px-4 pt-10 pb-12">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-white/70 hover:text-white text-sm transition mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            กลับหน้าหลัก
          </Link>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-11 h-11 bg-white/20 rounded-2xl flex items-center justify-center">
              <HelpCircle className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">ศูนย์ช่วยเหลือ</h1>
              <p className="text-white/70 text-sm">Help Center</p>
            </div>
          </div>
          <p className="text-white/80 text-sm max-w-lg">
            ค้นหาคำตอบสำหรับคำถามที่พบบ่อย หรือเลือกหมวดหมู่ที่ต้องการ
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 -mt-4 pb-16">
        {/* Quick links */}
        <div className="grid grid-cols-2 gap-3 mb-8">
          <Link
            href="/help"
            className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3 hover:shadow-md hover:border-blue-200 transition group"
          >
            <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center group-hover:bg-blue-100 transition">
              <BookOpen className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">คู่มือการใช้งาน</p>
              <p className="text-xs text-gray-400">Step-by-step guides</p>
            </div>
          </Link>
          <Link
            href="/contact"
            className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3 hover:shadow-md hover:border-blue-200 transition group"
          >
            <div className="w-9 h-9 bg-green-50 rounded-xl flex items-center justify-center group-hover:bg-green-100 transition">
              <MessageCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">ติดต่อทีมงาน</p>
              <p className="text-xs text-gray-400">Contact support</p>
            </div>
          </Link>
        </div>

        {/* FAQ count summary */}
        {items.length > 0 && (
          <p className="text-xs text-gray-400 mb-4">
            {items.length} คำถาม-คำตอบ · {categories.length} หมวดหมู่
          </p>
        )}

        {items.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-16 text-center">
            <HelpCircle className="w-12 h-12 mx-auto mb-3 text-gray-200" />
            <p className="text-gray-500 font-medium mb-1">ยังไม่มีคำถาม-คำตอบในขณะนี้</p>
            <Link href="/contact" className="text-sm text-blue-600 hover:underline mt-2 inline-block">
              ติดต่อทีมงานได้เลย →
            </Link>
          </div>
        ) : (
          <FaqSearch items={items} categories={categories} />
        )}
      </div>

      <PublicFooter />
    </div>
  )
}
