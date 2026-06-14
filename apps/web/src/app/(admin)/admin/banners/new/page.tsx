'use client'

import { useState, useTransition, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowLeft, ImagePlus, X, Loader2, AlignLeft, AlignCenter, AlignRight } from 'lucide-react'
import { createBanner } from '../actions'
import { useDocumentUpload } from '@/hooks/useUpload'

const POSITIONS = [
  { value: 'home_top',        label: 'หน้าแรก (Hero)' },
  { value: 'listing_top',     label: 'หน้า Listing (บน)' },
  { value: 'dashboard_top',   label: 'Dashboard (บน)' },
  { value: 'listing_sidebar', label: 'Listing (Sidebar)' },
]

const PRESET_GRADIENTS = [
  { label: 'Navy Blue', value: 'from-[#0f2044] via-[#1a3a6e] to-[#0e3460]' },
  { label: 'Emerald',   value: 'from-emerald-900 via-teal-800 to-cyan-900' },
  { label: 'Violet',    value: 'from-violet-900 via-purple-800 to-indigo-900' },
  { label: 'Slate',     value: 'from-slate-800 via-slate-700 to-slate-900' },
  { label: 'Rose',      value: 'from-rose-900 via-pink-800 to-red-900' },
  { label: 'Amber',     value: 'from-amber-800 via-orange-700 to-yellow-800' },
]

export default function NewBannerPage() {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    title:       '',
    subtitle:    '',
    tag:         '',
    text_align:  'center',
    gradient:    'from-[#0f2044] via-[#1a3a6e] to-[#0e3460]',
    show_search: true,
    link_url:    '',
    position:    'home_top',
    is_active:   true,
    start_date:  '',
    end_date:    '',
    sort_order:  0,
  })
  const imageRef = useRef<HTMLInputElement>(null)
  const imageState = useDocumentUpload({ category: 'banner-images' })

  function set<K extends keyof typeof form>(key: K, value: typeof form[K]) {
    setForm(f => ({ ...f, [key]: value }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim()) { setError('กรุณากรอกชื่อ / หัวเรื่อง'); return }
    setError('')
    startTransition(async () => {
      const res = await createBanner({
        title:       form.title.trim(),
        subtitle:    form.subtitle.trim() || undefined,
        tag:         form.tag.trim() || undefined,
        text_align:  form.text_align,
        gradient:    form.gradient.trim() || undefined,
        show_search: form.show_search,
        image_url:   imageState.url || undefined,
        link_url:    form.link_url.trim() || undefined,
        position:    form.position,
        is_active:   form.is_active,
        start_date:  form.start_date || undefined,
        end_date:    form.end_date || undefined,
        sort_order:  form.sort_order,
      })
      if (res.error) { setError(res.error); return }
      router.push('/admin/banners')
    })
  }

  const busy = imageState.progress.phase === 'processing' || imageState.progress.phase === 'uploading'
  const isHero = form.position === 'home_top'

  return (
    <div className="p-4 lg:p-8 pt-6 max-w-2xl">
      <Link href="/admin/banners" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition mb-5 w-fit">
        <ArrowLeft className="w-4 h-4" />
        กลับจัดการแบนเนอร์
      </Link>
      <h1 className="text-xl font-bold text-gray-900 mb-6">เพิ่มแบนเนอร์</h1>
      <form onSubmit={handleSubmit} className="space-y-4">

        {/* ── Position ── */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <label className="block text-sm font-medium text-gray-700 mb-2">ตำแหน่ง</label>
          <div className="flex gap-2 flex-wrap">
            {POSITIONS.map(p => (
              <button key={p.value} type="button" onClick={() => set('position', p.value)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
                  form.position === p.value ? 'bg-pink-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}>
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Image ── */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-3">
          <h2 className="text-sm font-semibold text-gray-700">รูปภาพ</h2>
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
              {busy
                ? <><Loader2 className="w-8 h-8 animate-spin" /><span className="text-sm">กำลังอัปโหลด...</span></>
                : <><ImagePlus className="w-8 h-8" /><span className="text-sm">คลิกเพื่ออัปโหลดรูปแบนเนอร์</span><span className="text-xs">แนะนำ 16:9 · JPG หรือ PNG</span></>
              }
            </button>
          )}
          <input ref={imageRef} type="file" accept="image/*" className="hidden"
            onChange={e => { const file = e.target.files?.[0]; if (file) imageState.upload(file); e.target.value = '' }} />
          {isHero && !imageState.url && (
            <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
              💡 ถ้าไม่ใส่รูป จะใช้ Gradient พื้นหลังแทน (ตั้งค่าด้านล่าง)
            </p>
          )}
        </div>

        {/* ── Text Content ── */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700">ข้อความ</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              ชื่อ / หัวเรื่อง *
              {isHero && <span className="text-xs text-gray-400 font-normal ml-1">(แสดงบน Hero)</span>}
            </label>
            <input value={form.title} onChange={e => set('title', e.target.value)}
              placeholder={isHero ? 'ค้นพบที่พักในฝัน ในแบบของคุณ' : 'ชื่อแบนเนอร์'}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          {isHero && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">คำอธิบาย / Subtitle</label>
                <input value={form.subtitle} onChange={e => set('subtitle', e.target.value)}
                  placeholder="ทรัพย์สินคุณภาพพร้อมเอเจนต์มืออาชีพดูแลคุณ"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">ป้าย Tag (badge บนหัว)</label>
                <input value={form.tag} onChange={e => set('tag', e.target.value)}
                  placeholder="🏠 Proppsy Real Estate"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">การจัดวางข้อความ</label>
                <div className="flex gap-2">
                  {([
                    { v: 'left',   Icon: AlignLeft,   label: 'ซ้าย' },
                    { v: 'center', Icon: AlignCenter,  label: 'กลาง' },
                    { v: 'right',  Icon: AlignRight,   label: 'ขวา' },
                  ] as const).map(({ v, Icon, label }) => (
                    <button key={v} type="button" onClick={() => set('text_align', v)}
                      className={`flex-1 flex flex-col items-center gap-1 py-2.5 rounded-xl border text-xs font-medium transition ${
                        form.text_align === v
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-gray-500 border-gray-200 hover:border-blue-300'
                      }`}>
                      <Icon className="w-4 h-4" />
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3 py-2 border-t border-gray-100">
                <button type="button" onClick={() => set('show_search', !form.show_search)}
                  className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${form.show_search ? 'bg-green-500' : 'bg-gray-200'}`}>
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.show_search ? 'translate-x-5' : ''}`} />
                </button>
                <div>
                  <p className="text-sm font-medium text-gray-700">แสดง Search Card</p>
                  <p className="text-xs text-gray-400">กล่องค้นหาที่พักบน Hero</p>
                </div>
              </div>
            </>
          )}
        </div>

        {/* ── Gradient ── */}
        {isHero && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-3">
            <h2 className="text-sm font-semibold text-gray-700">Gradient พื้นหลัง (ใช้เมื่อไม่มีรูป)</h2>
            <div className="grid grid-cols-3 gap-2">
              {PRESET_GRADIENTS.map(g => (
                <button key={g.value} type="button" onClick={() => set('gradient', g.value)}
                  className={`h-12 rounded-xl bg-gradient-to-br ${g.value} text-white text-xs font-medium relative overflow-hidden transition ring-2 ${
                    form.gradient === g.value ? 'ring-blue-500' : 'ring-transparent'
                  }`}>
                  <span className="relative z-10 drop-shadow">{g.label}</span>
                </button>
              ))}
            </div>
            <input value={form.gradient} onChange={e => set('gradient', e.target.value)}
              placeholder="from-blue-900 via-blue-700 to-indigo-800"
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-600" />
          </div>
        )}

        {/* ── Settings ── */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700">การตั้งค่า</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">ลิงก์ปลายทาง</label>
            <input value={form.link_url} onChange={e => set('link_url', e.target.value)}
              placeholder="https://example.com/promo"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">ลำดับการแสดง</label>
            <input type="number" min={0} value={form.sort_order}
              onChange={e => set('sort_order', parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <p className="text-xs text-gray-400 mt-1">ตัวเลขน้อย = แสดงก่อน</p>
          </div>

          <div className="flex items-center gap-3 py-2 border-t border-gray-100">
            <button type="button" onClick={() => set('is_active', !form.is_active)}
              className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${form.is_active ? 'bg-green-500' : 'bg-gray-200'}`}>
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.is_active ? 'translate-x-5' : ''}`} />
            </button>
            <div>
              <p className="text-sm font-medium text-gray-700">{form.is_active ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}</p>
              <p className="text-xs text-gray-400">{form.is_active ? 'แบนเนอร์จะแสดงในหน้าเว็บ' : 'ซ่อนแบนเนอร์ชั่วคราว'}</p>
            </div>
          </div>
        </div>

        {error && <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-600">{error}</div>}
        <div className="flex gap-3 pb-8">
          <Link href="/admin/banners" className="flex-1 py-3 border border-gray-200 text-gray-600 text-sm font-medium rounded-xl hover:bg-gray-50 transition text-center">
            ยกเลิก
          </Link>
          <button type="submit" disabled={pending || busy}
            className="flex-1 py-3 bg-pink-600 hover:bg-pink-700 disabled:bg-pink-300 text-white text-sm font-medium rounded-xl transition">
            {pending ? 'กำลังบันทึก...' : 'บันทึก'}
          </button>
        </div>
      </form>
    </div>
  )
}
