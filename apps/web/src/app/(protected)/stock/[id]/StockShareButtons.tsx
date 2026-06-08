'use client'

import { useState, useEffect } from 'react'
import { Link2, Check, Share2, Eye } from 'lucide-react'

interface Props {
  stockId: string
  title: string
  viewCount?: number
}

export default function StockShareButtons({ stockId, title, viewCount }: Props) {
  const [copied, setCopied] = useState(false)
  const [url, setUrl] = useState('')
  const [hasNativeShare, setHasNativeShare] = useState(false)

  useEffect(() => {
    const listingUrl = `${window.location.origin}/listing/${stockId}`
    setUrl(listingUrl)
    setHasNativeShare('share' in navigator)
  }, [stockId])

  if (!url) return null

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
        <h2 className="text-sm font-semibold text-gray-700">สถิติและแชร์ประกาศ</h2>
      </div>
      <div className="p-4 space-y-3">
        {viewCount !== undefined && (
          <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl">
            <Eye className="w-5 h-5 text-blue-400 flex-shrink-0" />
            <div>
              <p className="text-xs text-blue-500">การเข้าชมทั้งหมด</p>
              <p className="text-2xl font-bold text-blue-700 leading-none mt-0.5">
                {viewCount.toLocaleString('th-TH')}
              </p>
            </div>
          </div>
        )}
        <p className="text-xs text-gray-400 break-all">{url}</p>
        <div className="flex flex-wrap gap-2">
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
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-xl transition"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Link2 className="w-3.5 h-3.5" />}
            {copied ? 'คัดลอกแล้ว!' : 'คัดลอกลิงก์'}
          </button>
        </div>
      </div>
    </div>
  )
}
