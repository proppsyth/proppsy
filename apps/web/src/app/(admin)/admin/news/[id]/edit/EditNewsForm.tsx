'use client'

import { useState, useTransition, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowLeft, ImagePlus, X, Loader2 } from 'lucide-react'
import { updateNews } from '../../actions'
import { useDocumentUpload } from '@/hooks/useUpload'

interface News {
  id: string
  title: string
  summary?: string | null
  content?: string | null
  cover_url?: string | null
  published: boolean
}

export default function EditNewsForm({ news }: { news: News }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    title:     news.title,
    summary:   news.summary ?? '',
    content:   news.content ?? '',
    published: news.published,
  })
  const coverRef = useRef<HTMLInputElement>(null)
  const coverState = useDocumentUpload({ category: 'news-covers', initialUrl: news.cover_url ?? '' })

  function set(key: keyof typeof form, value: string | boolean) {
    setForm(f => ({ ...f, [key]: value }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim()) { setError('กรุณากรอกหัวข้อข่าว'); return }
    setError('')
    startTransition(async () => {
      const res = await updateNews(news.id, {
        title:     form.title.trim(),
        summary:   form.summary.trim() || undefined,
        content:   form.content.trim() || undefined,
        cover_url: coverState.url || null,
        published: form.published,
      })
      if (res.error) { setError(res.error); return }
      router.push('/admin/news')
    })
  }

  const busy = coverState.progress.phase === 'processing' || coverState.progress.phase === 'uploading'

  return (
    <div className="p-4 lg:p-8 pt-6 max-w-2xl">
      <Link href="/admin/news" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition mb-5 w-fit">
        <ArrowLeft className="w-4 h-4" />
        กลับจัดการข่าว
      </Link>
      <h1 className="text-xl font-bold text-gray-900 mb-6">แก้ไขข่าวสาร</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">รูปหน้าปก</label>
            {coverState.url ? (
              <div className="relative rounded-xl overflow-hidden aspect-video bg-gray-100">
                <Image src={coverState.url} alt="cover" fill className="object-cover" sizes="100vw" />
                <button type="button" onClick={coverState.clear}
                  className="absolute top-2 right-2 w-7 h-7 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center transition">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => coverRef.current?.click()} disabled={busy}
                className="w-full aspect-video border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center gap-2 hover:border-blue-400 hover:bg-blue-50 transition text-gray-400 disabled:opacity-50">
                {busy ? (
                  <><Loader2 className="w-8 h-8 animate-spin" /><span className="text-sm">กำลังอัปโหลด...</span></>
                ) : (
                  <><ImagePlus className="w-8 h-8" /><span className="text-sm">คลิกเพื่ออัปโหลดรูปหน้าปก</span><span className="text-xs">JPG, PNG — แนะนำ 16:9</span></>
                )}
              </button>
            )}
            <input ref={coverRef} type="file" accept="image/*" className="hidden"
              onChange={e => { const file = e.target.files?.[0]; if (file) coverState.upload(file); e.target.value = '' }} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">หัวข้อข่าว *</label>
            <input value={form.title} onChange={e => set('title', e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">สรุปย่อ</label>
            <textarea value={form.summary} onChange={e => set('summary', e.target.value)} rows={2}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">เนื้อหาข่าว</label>
            <textarea value={form.content} onChange={e => set('content', e.target.value)} rows={8}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          </div>
          <div className="flex items-center gap-3 py-2 border-t border-gray-100">
            <button type="button" onClick={() => set('published', !form.published)}
              className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${form.published ? 'bg-green-500' : 'bg-gray-200'}`}>
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.published ? 'translate-x-5' : ''}`} />
            </button>
            <div>
              <p className="text-sm font-medium text-gray-700">{form.published ? 'เผยแพร่แล้ว' : 'ฉบับร่าง'}</p>
              <p className="text-xs text-gray-400">{form.published ? 'ข่าวแสดงในหน้าสาธารณะ' : 'ยังไม่แสดงต่อสาธารณะ'}</p>
            </div>
          </div>
        </div>
        {error && <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-600">{error}</div>}
        <div className="flex gap-3">
          <Link href="/admin/news" className="flex-1 py-3 border border-gray-200 text-gray-600 text-sm font-medium rounded-xl hover:bg-gray-50 transition text-center">
            ยกเลิก
          </Link>
          <button type="submit" disabled={pending || busy}
            className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm font-medium rounded-xl transition">
            {pending ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข'}
          </button>
        </div>
      </form>
    </div>
  )
}
