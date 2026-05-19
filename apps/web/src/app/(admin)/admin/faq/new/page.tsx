'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createFaq } from '../actions'

const CATEGORIES = [
  { value: 'general',  label: 'ทั่วไป' },
  { value: 'contract', label: 'สัญญา' },
  { value: 'listing',  label: 'ทรัพย์' },
  { value: 'payment',  label: 'การชำระเงิน' },
  { value: 'account',  label: 'บัญชี' },
]

export default function NewFaqPage() {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    question:     '',
    answer:       '',
    category:     'general',
    sort_order:   0,
    is_published: true,
  })

  function set<K extends keyof typeof form>(key: K, value: typeof form[K]) {
    setForm(f => ({ ...f, [key]: value }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.question.trim()) { setError('กรุณากรอกคำถาม'); return }
    if (!form.answer.trim())   { setError('กรุณากรอกคำตอบ'); return }
    setError('')
    startTransition(async () => {
      const res = await createFaq({
        question:     form.question.trim(),
        answer:       form.answer.trim(),
        category:     form.category,
        sort_order:   form.sort_order,
        is_published: form.is_published,
      })
      if (res.error) { setError(res.error); return }
      router.push('/admin/faq')
    })
  }

  return (
    <div className="p-4 lg:p-8 pt-6 max-w-2xl">
      <Link href="/admin/faq" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition mb-5 w-fit">
        <ArrowLeft className="w-4 h-4" />
        กลับจัดการ FAQ
      </Link>
      <h1 className="text-xl font-bold text-gray-900 mb-6">เพิ่มคำถาม FAQ</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
          {/* Question */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">คำถาม *</label>
            <textarea value={form.question} onChange={e => set('question', e.target.value)}
              placeholder="คำถามที่พบบ่อย" rows={2}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 resize-none" />
          </div>

          {/* Answer */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">คำตอบ *</label>
            <textarea value={form.answer} onChange={e => set('answer', e.target.value)}
              placeholder="คำตอบที่ชัดเจนและครบถ้วน" rows={5}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 resize-none" />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">หมวดหมู่</label>
            <div className="flex gap-2 flex-wrap">
              {CATEGORIES.map(c => (
                <button key={c.value} type="button" onClick={() => set('category', c.value)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
                    form.category === c.value
                      ? 'bg-yellow-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}>
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Sort order */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">ลำดับการแสดง</label>
            <input type="number" min={0} value={form.sort_order}
              onChange={e => set('sort_order', parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400" />
            <p className="text-xs text-gray-400 mt-1">ตัวเลขน้อย = แสดงก่อน</p>
          </div>

          {/* Publish toggle */}
          <div className="flex items-center gap-3 py-2 border-t border-gray-100">
            <button type="button" onClick={() => set('is_published', !form.is_published)}
              className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${form.is_published ? 'bg-green-500' : 'bg-gray-200'}`}>
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.is_published ? 'translate-x-5' : ''}`} />
            </button>
            <div>
              <p className="text-sm font-medium text-gray-700">{form.is_published ? 'เผยแพร่ทันที' : 'ซ่อนไว้ก่อน'}</p>
              <p className="text-xs text-gray-400">{form.is_published ? 'คำถามจะแสดงในหน้า FAQ' : 'ยังไม่แสดงต่อสาธารณะ'}</p>
            </div>
          </div>
        </div>

        {error && <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-600">{error}</div>}
        <div className="flex gap-3">
          <Link href="/admin/faq" className="flex-1 py-3 border border-gray-200 text-gray-600 text-sm font-medium rounded-xl hover:bg-gray-50 transition text-center">
            ยกเลิก
          </Link>
          <button type="submit" disabled={pending}
            className="flex-1 py-3 bg-yellow-500 hover:bg-yellow-600 disabled:bg-yellow-300 text-white text-sm font-medium rounded-xl transition">
            {pending ? 'กำลังบันทึก...' : 'บันทึก'}
          </button>
        </div>
      </form>
    </div>
  )
}
