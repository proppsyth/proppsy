'use client'

import { useState } from 'react'
import Image from 'next/image'
import { ChevronLeft, ChevronRight, Home } from 'lucide-react'

export default function PhotoGallery({ urls }: { urls: string[] }) {
  const [current, setCurrent] = useState(0)

  if (urls.length === 0) {
    return (
      <div className="aspect-[4/3] bg-gray-100 rounded-xl flex items-center justify-center">
        <Home className="w-14 h-14 text-gray-300" />
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {/* Main photo */}
      <div className="relative aspect-[4/3] bg-gray-100 rounded-xl overflow-hidden group">
        <Image
          src={urls[current]!}
          alt={`ภาพที่ ${current + 1}`}
          fill
          className="object-cover"
          sizes="(max-width: 1024px) 100vw, 60vw"
          priority={current === 0}
        />

        {/* Prev / Next arrows */}
        {urls.length > 1 && (
          <>
            <button
              onClick={() => setCurrent(i => (i - 1 + urls.length) % urls.length)}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/40 hover:bg-black/60 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => setCurrent(i => (i + 1) % urls.length)}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/40 hover:bg-black/60 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
            >
              <ChevronRight className="w-5 h-5" />
            </button>

            {/* Dots */}
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
              {urls.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrent(i)}
                  className={`w-1.5 h-1.5 rounded-full transition ${i === current ? 'bg-white' : 'bg-white/50'}`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Thumbnails */}
      {urls.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {urls.map((url, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`relative w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden border-2 transition ${
                i === current ? 'border-blue-500' : 'border-transparent opacity-60 hover:opacity-100'
              }`}
            >
              <Image src={url} alt={`thumb ${i + 1}`} fill className="object-cover" sizes="64px" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
