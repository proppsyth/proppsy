'use client'

import { useEffect, useState, useCallback } from 'react'
import { Download, ExternalLink, RefreshCw } from 'lucide-react'

interface Props {
  contractId: string
  docLabel: string
}

function isMobileDevice(): boolean {
  if (typeof navigator === 'undefined') return false
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
}

export default function PreviewClient({ contractId, docLabel }: Props) {
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [mobile, setMobile] = useState(false)

  const fetchUrl = useCallback(async () => {
    setState('loading')
    setErrorMsg(null)
    try {
      const res = await fetch(`/api/contracts/${contractId}/preview-pdf?mode=json`, {
        credentials: 'include',
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? `HTTP ${res.status}`)
      }
      const data = await res.json()
      if (!data.url) throw new Error('ไม่ได้รับ URL สำหรับ PDF')
      setPdfUrl(data.url)
      setState('ready')
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ')
      setState('error')
    }
  }, [contractId])

  useEffect(() => {
    setMobile(isMobileDevice())
    fetchUrl()
  }, [fetchUrl])

  if (state === 'loading') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 bg-gray-900">
        <div className="w-10 h-10 border-4 border-white/20 border-t-white rounded-full animate-spin" />
        <p className="text-white/70 text-sm font-medium">กำลังสร้าง PDF...</p>
        <p className="text-white/40 text-xs">อาจใช้เวลา 20–45 วินาที</p>
      </div>
    )
  }

  if (state === 'error') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 bg-gray-900 px-6 text-center">
        <p className="text-4xl">⚠️</p>
        <p className="text-white font-semibold text-base">สร้าง PDF ไม่สำเร็จ</p>
        {errorMsg && (
          <p className="text-white/60 text-sm max-w-xs">{errorMsg}</p>
        )}
        <button
          onClick={fetchUrl}
          className="flex items-center gap-2 px-5 py-2.5 bg-white text-gray-900 text-sm font-semibold rounded-xl hover:bg-gray-100 active:bg-gray-200 transition mt-2"
        >
          <RefreshCw className="w-4 h-4" />
          ลองใหม่
        </button>
      </div>
    )
  }

  if (!pdfUrl) return null

  // Mobile: iframe PDF is unreliable on iOS Safari and some Android browsers.
  // Show action buttons instead of trying to embed the PDF.
  if (mobile) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 bg-gray-900 px-8 text-center">
        <p className="text-5xl">📄</p>
        <p className="text-white font-semibold text-base mt-2">{docLabel}</p>
        <p className="text-white/50 text-sm mt-1">
          เบราว์เซอร์มือถือไม่รองรับการแสดง PDF แบบฝัง
        </p>
        <div className="flex flex-col gap-3 w-full max-w-xs mt-4">
          <a
            href={pdfUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center gap-2 px-5 py-3 bg-white text-gray-900 text-sm font-semibold rounded-xl hover:bg-gray-100 active:bg-gray-200 transition"
          >
            <ExternalLink className="w-4 h-4" />
            เปิด PDF
          </a>
          <a
            href={pdfUrl}
            download
            className="flex items-center justify-center gap-2 px-5 py-3 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 active:bg-blue-800 transition"
          >
            <Download className="w-4 h-4" />
            ดาวน์โหลด PDF
          </a>
        </div>
      </div>
    )
  }

  return (
    <iframe
      src={pdfUrl}
      className="flex-1 w-full"
      style={{ border: 'none' }}
      title={docLabel}
    />
  )
}
