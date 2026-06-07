'use client'

import { useState, useTransition, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowLeft, ImagePlus, X, Loader2 } from 'lucide-react'
import { updateBanner } from '../../actions'
import { useDocumentUpload } from '@/hooks/useUpload'

interface Banner {
  id: string
  title: string
  image_url?: string | null
  link_url?: string | null
  position: string
  is_active: boolean
  start_date?: string | null
  end_date?: string | null
  sort_order: number
}

const POSITIONS = [
  { value: 'home_top',        label: 'หน้าแรก (บนสุด)' },
  { value: 'listing_top',     label: 'หน้า Listing (บน)' },
  { value: 'dashboard_top',   label: 'Dashboard (บน)' },
  { value: 'listing_sidebar', label: 'Listing (Sidebar)' },
]

export default function EditBannerForm({ banner }: { banner: Banner }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    title:      banner.title,
    link_url:   banner.link_url ?? '',
    position:   banner.position,
    is_active:  banner.is_active,
    start_date: banner.start_date ?? '',
    end_date:   banner.end_date ?? '',
    sort_order: banner.sort_order,
  })
  const imageRef = useRef<HTMLInputElement>(null)
  const imageState = useDocumentUpload({ category: 'banner-images', initialUrl: banner.image_url ?? '' })

  function set<K extends keyof typeof form>(key: K, value: typeof form[K]) {
    setForm(f => ({ ...f, [key]: value }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim()) { setError('กรุณากรอกชื่อแบนเนอร์'); return }
    setError('')
    startTransition(async () => {
      const res = await updateBanner(banner.id, {
        title:      form.title.trim(),
        image_url:  imageState.url || null,
        link_url:   form.link_url.trim() || null,
        position:   form.position,
        is_active:  form.is_active,
        start_date: form.start_date || null,
        end_date:   form.end_date || null,
        sort_order: form.sort_order,
      })
      if (res.error) { setError(res.error); return }
      router.push('/admin/banners')
    })
  }

  const busy = imageState.progress.phase === 'processing' || imageState.progress.phase === 'uploading'

  return (
    <div className="p-4 lg:p-8 pt-6 max-w-2xl">
      <Link href="/admin/banners" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition mb-5 w-fit">
        <ArrowLeft className="w-4 h-4" />
        กลับจัดการแบนเนอร์
      </Link>
      <h1 className="text-xl font-bold text-gray-900 mb-6">แก้ไขแบนเนอร์</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">ชื่อแบนเนอร์ *</label>
            <input value={form.title} onChange={e => set('title', e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          {/* Image */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">รูปแบนเนอร์</label>
            {imageState.url ? (
              <div className="relative rounded-xl overflow-hidden bg-gray-100" style={{ aspectRatio: '16/9' }}>
                <Image src={imageState.url} alt="banner" fill className="object-cover object-center" sizes="100vw" />
                <button type="button" onClick={imageState.clear}
                  className="absolute top-2 right-2 w-7 h-7 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center transition">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => imageRef.current?.click()} disabled={busy}
                className="w-full border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center gap-2 py-8 hover:border-pink-400 hover:bg-pink-50 transition text-gray-400 disabled:opacity-50">
                {busy ? (
                  <><Loader2 className="w-8 h-8 animate-spin" /><span className="text-sm">กำลังอัปโหลด...</span></>
                ) : (
                  <><ImagePlus className="w-8 h-8" /><span className="text-sm">คลิกเพื่ออัปโหลดรูปแบนเนอร์</span><span className="text-xs">แนะนำ 16:9, JPG หรือ PNG</span></>
                )}
              </button>
            )}
            <input ref={imageRef} type="file" accept="image/*" className="hidden"
              onChange={e => { const file = e.target.files?.[0]; if (file) imageState.upload(file); e.target.value = '' }} />
          </div>

          {/* Link URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">ลิงก์ปลายทาง</label>
            <input value={form.link_url} onChange={e => set('link_url', e.target.value)}
              placeholder="https://example.com/promo"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          {/* Position */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">ตำแหน่ง</label>
            <div className="flex gap-2 flex-wrap">
              {POSITIONS.map(p => (
                <button key={p.value} type="button" onClick={() => set('position', p.value)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
                    form.position === p.value
                      ? 'bg-pink-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Date range */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">วันที่เริ่มต้น</label>
              <input type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">วันที่สิ้นสุด</label>
              <input type="date" value={form.end_date} onChange={e => set('end_date', e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          {/* Sort order */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">ลำดับการแสดง</label>
            <input type="number" min={0} value={form.sort_order}
              onChange={e => set('sort_order', parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          {/* Active toggle */}
          <div className="flex items-center gap-3 py-2 border-t border-gray-100">
            <button type="button" onClick={() => set('is_active', !form.is_active)}
              className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${form.is_active ? 'bg-green-500' : 'bg-gray-200'}`}>
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.is_active ? 'translate-x-5' : ''}`} />
            </button>
            <div>
              <p className="text-sm font-medium text-gray-700">{form.is_active ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}</p>
              <p className="text-xs text-gray-400">{form.is_active ? 'แบนเนอร์แสดงในหน้าเว็บ' : 'ซ่อนแบนเนอร์ชั่วคราว'}</p>
            </div>
          </div>
        </div>

        {error && <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-600">{error}</div>}
        <div className="flex gap-3">
          <Link href="/admin/banners" className="flex-1 py-3 border border-gray-200 text-gray-600 text-sm font-medium rounded-xl hover:bg-gray-50 transition text-center">
            ยกเลิก
          </Link>
          <button type="submit" disabled={pending || busy}
            className="flex-1 py-3 bg-pink-600 hover:bg-pink-700 disabled:bg-pink-300 text-white text-sm font-medium rounded-xl transition">
            {pending ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข'}
          </button>
        </div>
      </form>
    </div>
  )
}
