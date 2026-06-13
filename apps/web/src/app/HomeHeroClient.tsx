'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Search, ChevronLeft, ChevronRight } from 'lucide-react'
import type { HeroSlide } from './listing/HeroBanner'

const ROOM_TYPES = [
  { value: 'all',        label: 'ทุกประเภทห้อง' },
  { value: 'Studio',    label: 'Studio' },
  { value: '1BR',       label: '1 ห้องนอน' },
  { value: '2BR',       label: '2 ห้องนอน' },
  { value: '3BR',       label: '3 ห้องนอน' },
  { value: 'Penthouse', label: 'Penthouse' },
]

interface Props {
  slides: HeroSlide[]
  provinces: string[]
  btsMrtOptions: string[]
}

export default function HomeHeroClient({ slides, provinces, btsMrtOptions }: Props) {
  const router = useRouter()
  const [current, setCurrent] = useState(0)
  const [paused, setPaused] = useState(false)
  const [lt, setLt] = useState<'rent' | 'sale'>('rent')
  const [roomType, setRoomType] = useState('all')
  const [province, setProvince] = useState('all')
  const [btsMrt, setBtsMrt] = useState('all')

  const next = useCallback(() => setCurrent(c => (c + 1) % slides.length), [slides.length])
  const prev = useCallback(() => setCurrent(c => (c - 1 + slides.length) % slides.length), [slides.length])

  useEffect(() => {
    if (paused || slides.length <= 1) return
    const t = setInterval(next, 5000)
    return () => clearInterval(t)
  }, [paused, next, slides.length])

  const slide = slides[current] ?? slides[0]!

  function handleSearch() {
    const params = new URLSearchParams()
    params.set('listing_type', lt)
    if (province !== 'all') params.set('province', province)
    if (btsMrt !== 'all') params.set('bts_mrt', btsMrt)
    if (roomType !== 'all') params.set('room_type', roomType)
    router.push(`/listing?${params.toString()}`)
  }

  return (
    <div
      className="relative min-h-[520px] sm:min-h-[600px] flex flex-col items-center justify-center overflow-hidden"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* ── Background ── */}
      {slide.type === 'image' ? (
        <Image
          src={slide.imageUrl!}
          alt={slide.title ?? 'Proppsy'}
          fill
          className="object-cover object-center"
          priority
          sizes="100vw"
        />
      ) : (
        <div className={`absolute inset-0 bg-gradient-to-br ${slide.gradient ?? 'from-blue-900 via-blue-700 to-indigo-800'}`}>
          <div
            className="absolute inset-0 opacity-[0.06]"
            style={{
              backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='1' fill-rule='evenodd'%3E%3Ccircle cx='40' cy='40' r='2'/%3E%3C/g%3E%3C/svg%3E\")",
              backgroundRepeat: 'repeat',
            }}
          />
        </div>
      )}

      {/* ── Overlay gradient ── */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/10 to-black/60 pointer-events-none" />

      {/* ── Content ── */}
      <div className="relative z-10 w-full max-w-2xl mx-auto px-4 flex flex-col items-center gap-5 pt-12 pb-16">
        {/* Tag */}
        <span className="inline-flex items-center gap-1.5 bg-white/15 backdrop-blur-md text-white text-xs font-medium px-4 py-1.5 rounded-full border border-white/25">
          🏠 Proppsy Real Estate
        </span>

        {/* Title */}
        <h1 className="text-3xl sm:text-5xl font-bold text-white text-center leading-tight drop-shadow-lg">
          ค้นพบที่พักในฝัน<br />ในแบบของคุณ
        </h1>
        <p className="text-white/80 text-sm sm:text-base text-center max-w-md">
          ทรัพย์สินคุณภาพพร้อมเอเจนต์มืออาชีพดูแลคุณ
        </p>

        {/* ── Search card ── */}
        <div className="w-full bg-white rounded-2xl shadow-2xl overflow-hidden mt-2">
          {/* Tabs: เช่า / ซื้อ */}
          <div className="flex border-b border-gray-100">
            {([{ v: 'rent' as const, l: 'เช่า' }, { v: 'sale' as const, l: 'ซื้อ' }]).map(({ v, l }) => (
              <button
                key={v}
                onClick={() => setLt(v)}
                className={`flex-1 py-3.5 text-sm font-semibold transition-colors ${
                  lt === v
                    ? 'text-blue-700 bg-blue-50/60 border-b-2 border-blue-600'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                {l}
              </button>
            ))}
          </div>

          {/* Filters */}
          <div className="p-4 flex flex-col sm:flex-row gap-2.5 items-stretch">
            {/* Room type */}
            <select
              value={roomType}
              onChange={e => setRoomType(e.target.value)}
              className="flex-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700 min-w-0"
            >
              {ROOM_TYPES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>

            {/* Province */}
            <select
              value={province}
              onChange={e => setProvince(e.target.value)}
              className="flex-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700 min-w-0"
            >
              <option value="all">ทุกจังหวัด</option>
              {provinces.map(p => <option key={p} value={p}>{p}</option>)}
            </select>

            {/* BTS/MRT */}
            {btsMrtOptions.length > 0 && (
              <select
                value={btsMrt}
                onChange={e => setBtsMrt(e.target.value)}
                className="flex-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700 min-w-0"
              >
                <option value="all">ทุกสายรถไฟฟ้า</option>
                {btsMrtOptions.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            )}

            {/* Search button */}
            <button
              onClick={handleSearch}
              className="flex items-center justify-center gap-2 px-7 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-semibold rounded-xl transition text-sm flex-shrink-0 shadow-sm"
            >
              <Search className="w-4 h-4" />
              ค้นหา
            </button>
          </div>
        </div>
      </div>

      {/* ── Carousel dots & arrows ── */}
      {slides.length > 1 && (
        <>
          <button
            onClick={prev}
            className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-black/25 hover:bg-black/45 backdrop-blur-sm rounded-full flex items-center justify-center transition text-white z-20"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={next}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-black/25 hover:bg-black/45 backdrop-blur-sm rounded-full flex items-center justify-center transition text-white z-20"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
          <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2 z-20">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === current ? 'w-8 bg-white' : 'w-2 bg-white/40'
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
