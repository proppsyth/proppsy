import type { Metadata } from 'next'
import Link from 'next/link'
import { ChevronDown, HelpCircle, ArrowLeft, MessageCircle } from 'lucide-react'
import PublicNav from '@/components/shared/PublicNav'
import { createServiceClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: 'คำถามที่พบบ่อย (FAQ) — Proppsy',
  description: 'คำถามและคำตอบที่พบบ่อยเกี่ยวกับ Proppsy แพลตฟอร์มจัดการอสังหาริมทรัพย์สำหรับเอเจนต์มืออาชีพ',
}

const CATEGORY_LABELS: Record<string, string> = {
  general:  'ทั่วไป',
  contract: 'สัญญาและเอกสาร',
  listing:  'ทรัพย์สิน',
  payment:  'การชำระเงิน',
  account:  'บัญชีและการเข้าสู่ระบบ',
}

const CATEGORY_ORDER = ['general', 'account', 'listing', 'contract', 'payment']

const CATEGORY_COLORS: Record<string, string> = {
  general:  'bg-gray-100 text-gray-600',
  contract: 'bg-indigo-100 text-indigo-700',
  listing:  'bg-blue-100 text-blue-700',
  payment:  'bg-green-100 text-green-700',
  account:  'bg-orange-100 text-orange-700',
}

interface FaqItem {
  id: string
  question: string
  answer: string
  category: string
  sort_order: number
}

export default async function FaqPage() {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('faq')
    .select('id, question, answer, category, sort_order')
    .eq('is_published', true)
    .order('category')
    .order('sort_order')

  const items = (data ?? []) as FaqItem[]

  // Group by category
  const grouped = new Map<string, FaqItem[]>()
  for (const item of items) {
    const cat = item.category ?? 'general'
    if (!grouped.has(cat)) grouped.set(cat, [])
    grouped.get(cat)!.push(item)
  }

  // Sort categories by defined order, then remaining alphabetically
  const sortedCategories = [
    ...CATEGORY_ORDER.filter(c => grouped.has(c)),
    ...[...grouped.keys()].filter(c => !CATEGORY_ORDER.includes(c)).sort(),
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <PublicNav />

      <div className="max-w-3xl mx-auto px-4 py-8 pb-16">
        <Link
          href="/"
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition mb-6 w-fit"
        >
          <ArrowLeft className="w-4 h-4" />
          กลับหน้าหลัก
        </Link>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
              <HelpCircle className="w-5 h-5 text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">คำถามที่พบบ่อย</h1>
          </div>
          <p className="text-sm text-gray-500 ml-13">
            คำตอบสำหรับคำถามที่ผู้ใช้งาน Proppsy ถามบ่อยที่สุด
          </p>
        </div>

        {/* Category chips (anchor links) */}
        {sortedCategories.length > 1 && (
          <div className="flex flex-wrap gap-2 mb-8">
            {sortedCategories.map(cat => (
              <a
                key={cat}
                href={`#${cat}`}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition hover:opacity-80 ${CATEGORY_COLORS[cat] ?? 'bg-gray-100 text-gray-600'}`}
              >
                {CATEGORY_LABELS[cat] ?? cat}
              </a>
            ))}
          </div>
        )}

        {items.length === 0 ? (
          <div className="text-center py-24 text-gray-400">
            <HelpCircle className="w-12 h-12 mx-auto mb-3 opacity-25" />
            <p className="text-sm">ยังไม่มีคำถาม-คำตอบในขณะนี้</p>
            <Link href="/contact" className="text-sm text-blue-600 hover:underline mt-2 inline-block">
              ติดต่อทีมงาน →
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {sortedCategories.map(cat => {
              const catItems = grouped.get(cat)!
              return (
                <div key={cat} id={cat}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${CATEGORY_COLORS[cat] ?? 'bg-gray-100 text-gray-600'}`}>
                      {CATEGORY_LABELS[cat] ?? cat}
                    </span>
                    <span className="text-xs text-gray-400">{catItems.length} คำถาม</span>
                  </div>

                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden divide-y divide-gray-50">
                    {catItems.map(item => (
                      <details key={item.id} className="group">
                        <summary className="flex items-center justify-between gap-4 px-5 py-4 cursor-pointer list-none select-none">
                          <span className="text-sm font-medium text-gray-800 leading-snug">
                            {item.question}
                          </span>
                          <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0 transition-transform duration-200 group-open:rotate-180" />
                        </summary>
                        <div className="px-5 pb-5 pt-1 text-sm text-gray-600 leading-relaxed whitespace-pre-line border-t border-gray-50">
                          {item.answer}
                        </div>
                      </details>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Still need help */}
        <div className="mt-10 bg-blue-50 border border-blue-100 rounded-2xl p-6 text-center">
          <MessageCircle className="w-8 h-8 mx-auto mb-3 text-blue-400" />
          <p className="text-sm font-semibold text-gray-800 mb-1">ไม่พบคำตอบที่ต้องการ?</p>
          <p className="text-xs text-gray-500 mb-4">ทีมงาน Proppsy พร้อมช่วยเหลือคุณ</p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/contact"
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition"
            >
              ติดต่อเรา
            </Link>
            <Link
              href="/help"
              className="px-5 py-2.5 bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-xl border border-gray-200 transition"
            >
              คู่มือการใช้งาน
            </Link>
          </div>
        </div>
      </div>

      <footer className="border-t border-gray-100 py-6 text-center text-xs text-gray-400">
        © {new Date().getFullYear()} Proppsy · Real Estate Management Platform
      </footer>
    </div>
  )
}
