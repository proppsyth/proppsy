'use client'

import { useState, useEffect } from 'react'
import { Link2, Check, Share2 } from 'lucide-react'
// LINE and Facebook share removed — native browser share + copy link is sufficient

interface Props {
  path: string
  title: string
}

export default function ShareButtons({ path, title }: Props) {
  const [copied, setCopied] = useState(false)
  const [url, setUrl] = useState(path)                 // relative path is safe for SSR
  const [hasNativeShare, setHasNativeShare] = useState(false)

  useEffect(() => {
    setUrl(`${window.location.origin}${path}`)
    setHasNativeShare('share' in navigator)
  }, [path])

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
    <div className="flex items-center gap-2 flex-wrap">
      {/* Native share — rendered only after mount on supported devices */}
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
  )
}
