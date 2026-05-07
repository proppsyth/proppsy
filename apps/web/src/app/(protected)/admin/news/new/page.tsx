'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createNews } from '../actions'

export default function NewNewsPage() {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    title: '',
    summary: '',
    content: '',
    published: false,
  })

  function set(key: keyof typeof form, value: string | boolean) {
    setForm(f => ({ ...f, [key]: value }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim()) { setError('กรุณากรอกหัวข้อข่าว'); return }
    setError('')
    startTransition(async () => {
      const res = await createNews({
        title: form.title.trim(),
        summary: form.summary.trim() || undefined,
        content: form.content.trim() || undefined,
        published: form.published,
      })
      if (res.error) { setError(res.error); return }
      router.push('/admin/news')
    })
  }

  return (
    <div className="p-4 lg:p-8 pt-6 max-w-2xl">
      <Link href="/admin/news" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition mb-5 w-fit">
        <ArrowLeft className="w-4 h-4" />
        กลับจัดการข่าว
      </Link>

      <h1 className="text-xl font-bold text-gray-900 mb-6">เพิ่มข่าวสาร</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">หัวข้อข่าว *</label>
            <input
              value={form.title}
              onChange={e => set('title', e.target.value)}
              placeholder="หัวข้อข่าว"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">สรุปย่อ</label>
            <textarea
              value={form.summary}
              onChange={e => set('summary', e.target.value)}
              placeholder="สรุปย่อ (แสดงในหน้ารายการข่าว)"
              rows={2}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">เนื้อหาข่าว</label>
            <textarea
              value={form.content}
              onChange={e => set('content', e.target.value)}
              placeholder="เนื้อหาข่าวทั้งหมด"
              rows={8}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
          <div className="flex items-center gap-3 py-2 border-t border-gray-100">
            <button
              type="button"
              onClick={() => set('published', !form.published)}
              className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${form.published ? 'bg-green-500' : 'bg-gray-200'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.published ? 'translate-x-5' : ''}`} />
            </button>
            <div>
              <p className="text-sm font-medium text-gray-700">{form.published ? 'เผยแพร่ทันที' : 'บันทึกเป็นฉบับร่าง'}</p>
              <p className="text-xs text-gray-400">{form.published ? 'ข่าวจะแสดงในหน้าสาธารณะ' : 'ยังไม่แสดงต่อสาธารณะ'}</p>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <Link href="/admin/news" className="flex-1 py-3 border border-gray-200 text-gray-600 text-sm font-medium rounded-xl hover:bg-gray-50 transition text-center">
            ยกเลิก
          </Link>
          <button
            type="submit"
            disabled={pending}
            className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm font-medium rounded-xl transition"
          >
            {pending ? 'กำลังบันทึก...' : 'บันทึก'}
          </button>
        </div>
      </form>
    </div>
  )
}
