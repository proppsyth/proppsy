'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import SearchBar from './SearchBar'
import type { HeroSlide } from './HeroBanner'

interface Props {
  slides: HeroSlide[]
  currentQ: string
}

export default function HeroBannerClient({ slides, currentQ }: Props) {
  const [current, setCurrent] = useState(0)
  const [paused, setPaused] = useState(false)

  const next = useCallback(() => setCurrent(c => (c + 1) % slides.length), [slides.length])
  const prev = useCallback(() => setCurrent(c => (c - 1 + slides.length) % slides.length), [slides.length])

  useEffect(() => {
    if (paused || slides.length <= 1) return
    const t = setInterval(next, 5000)
    return () => clearInterval(t)
  }, [paused, next, slides.length])

  const slide = slides[current] ?? slides[0]!

  return (
    <div
      className="relative overflow-hidden"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {slide.type === 'image' ? (
        /* ── DB image banner ── */
        <div className="relative w-full" style={{ minHeight: 280, maxHeight: 480, aspectRatio: '16/6' }}>
          <Image
            src={slide.imageUrl!}
            alt={slide.title ?? 'แบนเนอร์'}
            fill
            className="object-cover"
            sizes="100vw"
            priority
          />
          {/* Overlay with optional link */}
          {slide.linkUrl && (
            <Link
              href={slide.linkUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="absolute inset-0"
              aria-label={slide.title ?? 'ดูรายละเอียด'}
            />
          )}
          {/* Search overlay on first image slide if no title conflict */}
          <div className="absolute inset-0 bg-black/20 flex items-end justify-center pb-8 pointer-events-none">
            <div className="pointer-events-auto w-full max-w-xl px-4">
              <Suspense fallback={<div className="h-12" />}>
                <SearchBar currentQ={currentQ} />
              </Suspense>
            </div>
          </div>
        </div>
      ) : (
        /* ── Gradient fallback slide ── */
        <div className={`relative bg-gradient-to-br ${slide.gradient} text-white`}>
          <div className="absolute inset-0 opacity-10 pointer-events-none"
            style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")", backgroundRepeat: 'repeat' }}
          />
          <div className="relative max-w-6xl mx-auto px-4 py-12 sm:py-16 text-center min-h-[280px] flex flex-col items-center justify-center gap-4">
            {slide.tag && (
              <span className="inline-block bg-white/20 backdrop-blur-sm text-white text-xs font-medium px-3 py-1 rounded-full">
                {slide.tag}
              </span>
            )}
            {slide.title && (
              <h1 className="text-3xl sm:text-4xl font-bold whitespace-pre-line leading-tight">
                {slide.title}
              </h1>
            )}
            {slide.subtitle && (
              <p className="text-white/80 text-sm sm:text-base max-w-lg mx-auto">
                {slide.subtitle}
              </p>
            )}
            {slide.showSearch && (
              <Suspense fallback={<div className="h-14 max-w-xl w-full mx-auto" />}>
                <SearchBar currentQ={currentQ} />
              </Suspense>
            )}
          </div>
        </div>
      )}

      {/* Prev/Next (only when multiple slides) */}
      {slides.length > 1 && (
        <>
          <button onClick={prev}
            className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/20 hover:bg-black/40 rounded-full flex items-center justify-center transition text-white z-10">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button onClick={next}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/20 hover:bg-black/40 rounded-full flex items-center justify-center transition text-white z-10">
            <ChevronRight className="w-4 h-4" />
          </button>
          <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-2 z-10">
            {slides.map((_, i) => (
              <button key={i} onClick={() => setCurrent(i)}
                className={`h-2 rounded-full transition-all duration-300 ${i === current ? 'w-6 bg-white' : 'w-2 bg-white/50'}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
