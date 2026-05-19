import Link from 'next/link'
import { Plus, HelpCircle } from 'lucide-react'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import FaqRow from './FaqRow'

export const metadata: Metadata = { title: 'FAQ — Admin' }

const CATEGORIES = [
  { key: 'general',  label: 'ทั่วไป' },
  { key: 'contract', label: 'สัญญา' },
  { key: 'listing',  label: 'ทรัพย์' },
  { key: 'payment',  label: 'การชำระเงิน' },
  { key: 'account',  label: 'บัญชี' },
]

export default async function AdminFaqPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: faqs } = await supabase
    .from('faq')
    .select('*')
    .order('category')
    .order('sort_order')

  const all       = faqs ?? []
  const published = all.filter(f => f.is_published)

  const byCategory = CATEGORIES.map(c => ({
    ...c,
    items: all.filter(f => f.category === c.key),
  }))

  return (
    <div className="p-4 lg:p-8 pt-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-yellow-50 rounded-xl flex items-center justify-center">
            <HelpCircle className="w-5 h-5 text-yellow-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">FAQ & คู่มือ</h1>
            <p className="text-xs text-gray-400">จัดการคำถามที่พบบ่อย</p>
          </div>
        </div>
        <Link
          href="/admin/faq/new"
          className="flex items-center gap-2 px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white text-sm font-medium rounded-xl transition"
        >
          <Plus className="w-4 h-4" />
          เพิ่มคำถาม
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">{all.length}</p>
          <p className="text-xs text-gray-400 mt-0.5">ทั้งหมด</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{published.length}</p>
          <p className="text-xs text-gray-400 mt-0.5">เผยแพร่แล้ว</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
          <p className="text-2xl font-bold text-yellow-500">{CATEGORIES.filter(c => all.some(f => f.category === c.key)).length}</p>
          <p className="text-xs text-gray-400 mt-0.5">หมวดหมู่</p>
        </div>
      </div>

      {/* Category counts */}
      <div className="flex gap-2 flex-wrap mb-5">
        {byCategory.map(c => (
          <div key={c.key} className="px-3 py-1.5 bg-gray-100 rounded-full text-xs text-gray-600">
            {c.label}: <span className="font-semibold">{c.items.length}</span>
          </div>
        ))}
      </div>

      {/* Grouped by category */}
      {all.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
          <HelpCircle className="w-10 h-10 mx-auto mb-3 text-gray-200" />
          <p className="text-gray-400 text-sm">ยังไม่มีคำถาม FAQ</p>
          <Link href="/admin/faq/new" className="text-sm text-yellow-600 hover:underline mt-2 inline-block">
            เพิ่มคำถามแรก →
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {byCategory.map(cat => {
            if (cat.items.length === 0) return null
            return (
              <div key={cat.key}>
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">{cat.label}</h2>
                <div className="space-y-3">
                  {cat.items.map(f => (
                    <FaqRow key={f.id} faq={f} />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
