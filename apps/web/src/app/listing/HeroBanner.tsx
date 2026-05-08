'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import SearchBar from './SearchBar'

const SLIDES = [
  {
    gradient: 'from-blue-900 via-blue-700 to-indigo-800',
    tag: '🏠 Proppsy Real Estate',
    title: 'ค้นหาที่พักในฝัน\nทั่วประเทศไทย',
    subtitle: 'ทรัพย์สินคุณภาพพร้อมเอเจนต์มืออาชีพดูแลคุณตลอด 24 ชั่วโมง',
    showSearch: true,
  },
  {
    gradient: 'from-violet-900 via-purple-700 to-indigo-800',
    tag: '🤖 AI Smart Paste',
    title: 'เพิ่มทรัพย์ใน\n10 วินาที',
    subtitle: 'วางข้อความจาก Line แล้วให้ AI เติมข้อมูลให้อัตโนมัติ ประหยัดเวลาทำงานได้มากกว่า 80%',
    showSearch: false,
  },
  {
    gradient: 'from-emerald-900 via-teal-700 to-cyan-800',
    tag: '📄 สัญญาครบ 9 ประเภท',
    title: 'PDF ภาษาไทย\nพร้อมลายเซ็นดิจิทัล',
    subtitle: 'ออกสัญญาเช่า จอง ใบเสร็จ คอมมิชชัน ได้ในคลิกเดียว รองรับลายเซ็นอิเล็กทรอนิกส์',
    showSearch: false,
  },
]

export default function HeroBanner({ currentQ }: { currentQ: string }) {
  const [current, setCurrent] = useState(0)
  const [paused, setPaused] = useState(false)

  const next = useCallback(() => setCurrent(c => (c + 1) % SLIDES.length), [])
  const prev = useCallback(() => setCurrent(c => (c - 1 + SLIDES.length) % SLIDES.length), [])

  useEffect(() => {
    if (paused) return
    const t = setInterval(next, 5000)
    return () => clearInterval(t)
  }, [paused, next])

  const slide = SLIDES[current] ?? SLIDES[0]!

  return (
    <div
      className={`relative bg-gradient-to-br ${slide.gradient} text-white overflow-hidden transition-colors duration-700`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Pattern */}
      <div className="absolute inset-0 opacity-10 pointer-events-none"
        style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")", backgroundRepeat: 'repeat' }}
      />

      {/* Content */}
      <div className="relative max-w-6xl mx-auto px-4 py-12 sm:py-16 text-center min-h-[280px] flex flex-col items-center justify-center gap-4">
        <span className="inline-block bg-white/20 backdrop-blur-sm text-white text-xs font-medium px-3 py-1 rounded-full">
          {slide.tag}
        </span>
        <h1 className="text-3xl sm:text-4xl font-bold whitespace-pre-line leading-tight">
          {slide.title}
        </h1>
        <p className="text-white/80 text-sm sm:text-base max-w-lg mx-auto">
          {slide.subtitle}
        </p>
        {slide.showSearch && (
          <Suspense fallback={<div className="h-14 max-w-xl w-full mx-auto" />}>
            <SearchBar currentQ={currentQ} />
          </Suspense>
        )}
      </div>

      {/* Prev/Next */}
      <button onClick={prev}
        className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition">
        <ChevronLeft className="w-4 h-4" />
      </button>
      <button onClick={next}
        className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition">
        <ChevronRight className="w-4 h-4" />
      </button>

      {/* Dots */}
      <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2">
        {SLIDES.map((_, i) => (
          <button key={i} onClick={() => setCurrent(i)}
            className={`h-2 rounded-full transition-all duration-300 ${i === current ? 'w-6 bg-white' : 'w-2 bg-white/40'}`}
          />
        ))}
      </div>
    </div>
  )
}
