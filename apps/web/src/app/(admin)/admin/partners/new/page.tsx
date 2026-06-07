'use client'

import { useState, useTransition, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowLeft, ImagePlus, X, Loader2 } from 'lucide-react'
import { createPartner } from '../actions'
import { useDocumentUpload } from '@/hooks/useUpload'

export default function NewPartnerPage() {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    name_th:    '',
    name_en:    '',
    website:    '',
    sort_order: 0,
    is_active:  true,
  })
  const imageRef  = useRef<HTMLInputElement>(null)
  const logoState = useDocumentUpload({ category: 'partner-logos' })

  function set<K extends keyof typeof form>(key: K, value: typeof form[K]) {
    setForm(f => ({ ...f, [key]: value }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name_th.trim()) { setError('กรุณากรอกชื่อพาร์ทเนอร์'); return }
    setError('')
    startTransition(async () => {
      const res = await createPartner({
        name_th:    form.name_th.trim(),
        name_en:    form.name_en.trim() || undefined,
        logo_url:   logoState.url || undefined,
        website:    form.website.trim() || undefined,
        sort_order: form.sort_order,
        is_active:  form.is_active,
      })
      if (res.error) { setError(res.error); return }
      router.push('/admin/partners')
    })
  }

  const busy = logoState.progress.phase === 'processing' || logoState.progress.phase === 'uploading'

  return (
    <div className="p-4 lg:p-8 pt-6 max-w-2xl">
      <Link href="/admin/partners" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition mb-5 w-fit">
        <ArrowLeft className="w-4 h-4" />
        กลับจัดการพาร์ทเนอร์
      </Link>
      <h1 className="text-xl font-bold text-gray-900 mb-6">เพิ่มพาร์ทเนอร์</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">

          {/* Logo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">โลโก้ (ไม่บังคับ)</label>
            {logoState.url ? (
              <div className="relative w-32 h-20 rounded-xl overflow-hidden bg-gray-100 border border-gray-200">
                <Image src={logoState.url} alt="logo" fill className="object-contain p-2" />
                <button type="button" onClick={logoState.clear}
                  className="absolute top-1 right-1 w-5 h-5 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => imageRef.current?.click()} disabled={busy}
                className="w-full border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center gap-2 py-6 hover:border-blue-400 hover:bg-blue-50 transition text-gray-400 disabled:opacity-50">
                {busy ? (
                  <><Loader2 className="w-6 h-6 animate-spin" /><span className="text-sm">กำลังอัปโหลด...</span></>
                ) : (
                  <><ImagePlus className="w-6 h-6" /><span className="text-sm">อัปโหลดโลโก้</span><span className="text-xs">PNG หรือ JPG แนะนำพื้นหลังโปร่งใส</span></>
                )}
              </button>
            )}
            <input ref={imageRef} type="file" accept="image/*" className="hidden"
              onChange={e => { const file = e.target.files?.[0]; if (file) logoState.upload(file); e.target.value = '' }} />
          </div>

          {/* Name TH */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">ชื่อ (ภาษาไทย) *</label>
            <input value={form.name_th} onChange={e => set('name_th', e.target.value)} placeholder="เช่น บริษัท เอบีซี พร็อพเพอร์ตี้"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          {/* Name EN */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">ชื่อ (ภาษาอังกฤษ)</label>
            <input value={form.name_en} onChange={e => set('name_en', e.target.value)} placeholder="เช่น ABC Property Co., Ltd."
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          {/* Website */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">เว็บไซต์</label>
            <input value={form.website} onChange={e => set('website', e.target.value)} placeholder="https://example.com"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          {/* Sort order */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">ลำดับการแสดง</label>
            <input type="number" min={0} value={form.sort_order} onChange={e => set('sort_order', parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <p className="text-xs text-gray-400 mt-1">ตัวเลขน้อย = แสดงก่อน</p>
          </div>

          {/* Active toggle */}
          <div className="flex items-center gap-3 py-2 border-t border-gray-100">
            <button type="button" onClick={() => set('is_active', !form.is_active)}
              className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${form.is_active ? 'bg-green-500' : 'bg-gray-200'}`}>
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.is_active ? 'translate-x-5' : ''}`} />
            </button>
            <div>
              <p className="text-sm font-medium text-gray-700">{form.is_active ? 'แสดงบนหน้าแรก' : 'ซ่อน'}</p>
            </div>
          </div>
        </div>

        {error && <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-600">{error}</div>}
        <div className="flex gap-3">
          <Link href="/admin/partners" className="flex-1 py-3 border border-gray-200 text-gray-600 text-sm font-medium rounded-xl hover:bg-gray-50 transition text-center">
            ยกเลิก
          </Link>
          <button type="submit" disabled={pending || busy}
            className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm font-medium rounded-xl transition">
            {pending ? 'กำลังบันทึก...' : 'บันทึก'}
          </button>
        </div>
      </form>
    </div>
  )
}
