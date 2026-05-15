'use client'

import { useState, useEffect } from 'react'
import { Link2, Check, Share2 } from 'lucide-react'

interface Props {
  stockId: string
  title: string
}

export default function StockShareButtons({ stockId, title }: Props) {
  const [copied, setCopied] = useState(false)
  const [url, setUrl] = useState('')
  const [hasNativeShare, setHasNativeShare] = useState(false)

  useEffect(() => {
    const listingUrl = `${window.location.origin}/listing/${stockId}`
    setUrl(listingUrl)
    setHasNativeShare('share' in navigator)
  }, [stockId])

  if (!url) return null

  const encodedUrl   = encodeURIComponent(url)
  const encodedTitle = encodeURIComponent(title)

  function handleNativeShare() {
    navigator.share({ title, url }).catch(() => {})
  }

  function handleCopy() {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50/70">
        <h2 className="text-sm font-semibold text-gray-700">แชร์ประกาศสาธารณะ</h2>
      </div>
      <div className="p-4">
        <p className="text-xs text-gray-400 mb-3 break-all">{url}</p>
        <div className="flex flex-wrap gap-2">
          {/* LINE */}
          <a
            href={`https://social-plugins.line.me/lineit/share?url=${encodedUrl}&text=${encodedTitle}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#06C755] hover:bg-[#05a347] text-white text-xs font-semibold rounded-xl transition"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="white" aria-hidden="true">
              <path d="M14 6.7c0-3.3-3.1-6-7-6S0 3.4 0 6.7c0 3 2.5 5.4 5.9 5.9.23.05.54.16.62.36.07.17.05.45.02.63l-.1.57c-.03.2-.14.68.6.37.73-.31 3.97-2.34 5.42-4.01C13.97 9.43 14 8.17 14 6.7z" />
            </svg>
            LINE
          </a>

          {/* Facebook */}
          <a
            href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1877F2] hover:bg-[#166fe5] text-white text-xs font-semibold rounded-xl transition"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="white" aria-hidden="true">
              <path d="M16 8.05C16 3.6 12.4 0 8 0S0 3.6 0 8.05c0 4 2.9 7.3 6.75 7.9V10.4H4.7V8.05h2.05V6.3c0-2 1.2-3.1 3-3.1.85 0 1.75.15 1.75.15v1.95h-1c-.97 0-1.27.6-1.27 1.2v1.45h2.17l-.35 2.35H9.23V16C13.1 15.35 16 12.05 16 8.05z" />
            </svg>
            Facebook
          </a>

          {/* Native share */}
          {hasNativeShare && (
            <button
              type="button"
              onClick={handleNativeShare}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-xl transition"
            >
              <Share2 className="w-3.5 h-3.5" />
              แชร์
            </button>
          )}

          {/* Copy link */}
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-xl transition"
          >
            {copied
              ? <Check className="w-3.5 h-3.5 text-green-600" />
              : <Link2 className="w-3.5 h-3.5" />
            }
            {copied ? 'คัดลอกแล้ว!' : 'คัดลอกลิงก์'}
          </button>
        </div>
      </div>
    </div>
  )
}
