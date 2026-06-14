'use client'

import { useState, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight, Home, Download, Loader2, ZoomIn, X, Maximize2 } from 'lucide-react'
import StorageImage from '@/components/shared/StorageImage'

export default function PhotoGallery({ urls }: { urls: string[] }) {
  const [current, setCurrent] = useState(0)
  const [lightbox, setLightbox] = useState(false)
  const [downloading, setDownloading] = useState(false)

  // Keyboard navigation
  const handleKey = useCallback((e: KeyboardEvent) => {
    if (!lightbox) return
    if (e.key === 'ArrowRight') setCurrent(i => (i + 1) % urls.length)
    if (e.key === 'ArrowLeft')  setCurrent(i => (i - 1 + urls.length) % urls.length)
    if (e.key === 'Escape')     setLightbox(false)
  }, [lightbox, urls.length])

  useEffect(() => {
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [handleKey])

  // Lock body scroll when lightbox open
  useEffect(() => {
    document.body.style.overflow = lightbox ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [lightbox])

  async function downloadAll() {
    if (downloading) return
    setDownloading(true)
    for (let i = 0; i < urls.length; i++) {
      try {
        const res = await fetch(urls[i]!)
        const blob = await res.blob()
        const ext = blob.type.includes('png') ? 'png' : 'jpg'
        const a = document.createElement('a')
        a.href = URL.createObjectURL(blob)
        a.download = `photo-${i + 1}.${ext}`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(a.href)
        await new Promise(r => setTimeout(r, 300))
      } catch {}
    }
    setDownloading(false)
  }

  if (urls.length === 0) {
    return (
      <div className="w-full aspect-video bg-gray-100 rounded-xl flex items-center justify-center">
        <Home className="w-14 h-14 text-gray-300" />
      </div>
    )
  }

  return (
    <>
      <div className="w-full space-y-2">
        {/* Main photo */}
        <div
          className="relative w-full aspect-video bg-gray-100 rounded-xl overflow-hidden group cursor-zoom-in"
          onClick={() => setLightbox(true)}
        >
          <StorageImage
            src={urls[current]}
            alt={`ภาพที่ ${current + 1}`}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            sizes="(max-width: 1024px) 100vw, 60vw"
            priority={current === 0}
            fallback={
              <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                <Home className="w-14 h-14 text-gray-300" />
              </div>
            }
          />

          {/* Zoom hint overlay */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
            <div className="bg-black/50 text-white rounded-full px-3 py-1.5 flex items-center gap-1.5 text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity">
              <ZoomIn className="w-3.5 h-3.5" />
              ดูรูปขนาดใหญ่
            </div>
          </div>

          {/* Expand icon top-right */}
          <div className="absolute top-2 right-2 bg-black/40 text-white rounded-lg p-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <Maximize2 className="w-4 h-4" />
          </div>

          {/* Prev / Next arrows */}
          {urls.length > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); setCurrent(i => (i - 1 + urls.length) % urls.length) }}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/40 hover:bg-black/60 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setCurrent(i => (i + 1) % urls.length) }}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/40 hover:bg-black/60 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
              >
                <ChevronRight className="w-5 h-5" />
              </button>

              {/* Dots */}
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                {urls.map((_, i) => (
                  <button
                    key={i}
                    onClick={(e) => { e.stopPropagation(); setCurrent(i) }}
                    className={`w-1.5 h-1.5 rounded-full transition ${i === current ? 'bg-white' : 'bg-white/50'}`}
                  />
                ))}
              </div>
            </>
          )}

          {/* Photo count badge */}
          {urls.length > 1 && (
            <div className="absolute bottom-2 right-2 bg-black/50 text-white text-xs px-2 py-0.5 rounded-full">
              {current + 1}/{urls.length}
            </div>
          )}
        </div>

        {/* Thumbnails */}
        {urls.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {urls.map((url, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`relative w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden border-2 transition ${
                  i === current ? 'border-blue-500' : 'border-transparent opacity-60 hover:opacity-100'
                }`}
              >
                <StorageImage src={url} alt={`thumb ${i + 1}`} fill className="object-cover" sizes="64px" />
              </button>
            ))}
          </div>
        )}

        {/* Download all */}
        <button
          type="button"
          onClick={downloadAll}
          disabled={downloading}
          className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition disabled:opacity-50 w-fit"
        >
          {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          {downloading ? 'กำลังดาวน์โหลด...' : `ดาวน์โหลดรูปทั้งหมด (${urls.length})`}
        </button>
      </div>

      {/* ─── Lightbox ─────────────────────────────────────────── */}
      {lightbox && (
        <div
          className="fixed inset-0 z-[9999] bg-black/95 flex flex-col"
          onClick={() => setLightbox(false)}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 flex-shrink-0" onClick={e => e.stopPropagation()}>
            <span className="text-white/70 text-sm">{current + 1} / {urls.length}</span>
            <button
              onClick={() => setLightbox(false)}
              className="w-9 h-9 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Main image */}
          <div className="flex-1 flex items-center justify-center relative px-4 min-h-0" onClick={e => e.stopPropagation()}>
            {/* Prev */}
            {urls.length > 1 && (
              <button
                onClick={() => setCurrent(i => (i - 1 + urls.length) % urls.length)}
                className="absolute left-2 sm:left-4 z-10 w-10 h-10 bg-white/10 hover:bg-white/25 text-white rounded-full flex items-center justify-center transition"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            )}

            <div className="relative w-full h-full max-w-5xl">
              <StorageImage
                src={urls[current]}
                alt={`ภาพที่ ${current + 1}`}
                fill
                className="object-contain"
                sizes="100vw"
                priority
                fallback={
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Home className="w-20 h-20 text-white/20" />
                  </div>
                }
              />
            </div>

            {/* Next */}
            {urls.length > 1 && (
              <button
                onClick={() => setCurrent(i => (i + 1) % urls.length)}
                className="absolute right-2 sm:right-4 z-10 w-10 h-10 bg-white/10 hover:bg-white/25 text-white rounded-full flex items-center justify-center transition"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            )}
          </div>

          {/* Thumbnails strip */}
          {urls.length > 1 && (
            <div className="flex-shrink-0 px-4 py-3" onClick={e => e.stopPropagation()}>
              <div className="flex gap-2 overflow-x-auto justify-center scrollbar-none">
                {urls.map((url, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrent(i)}
                    className={`relative w-14 h-14 flex-shrink-0 rounded-lg overflow-hidden border-2 transition ${
                      i === current ? 'border-white' : 'border-white/20 opacity-50 hover:opacity-100'
                    }`}
                  >
                    <StorageImage src={url} alt="" fill className="object-cover" sizes="56px" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  )
}
