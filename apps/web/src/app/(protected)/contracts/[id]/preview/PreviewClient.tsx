'use client'

import { useEffect, useState, useCallback } from 'react'
import { RefreshCw } from 'lucide-react'
import PdfViewer from '@/components/pdf/PdfViewer'

interface Props {
  contractId: string
  docLabel: string
}

export default function PreviewClient({ contractId, docLabel }: Props) {
  const [state, setState]       = useState<'loading' | 'ready' | 'error'>('loading')
  const [pdfUrl, setPdfUrl]     = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [elapsed, setElapsed]   = useState(0)

  const fetchUrl = useCallback(async () => {
    setState('loading')
    setElapsed(0)
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
    fetchUrl()
  }, [fetchUrl])

  // Elapsed-seconds ticker for the loading state
  useEffect(() => {
    if (state !== 'loading') return
    const id = setInterval(() => setElapsed(s => s + 1), 1000)
    return () => clearInterval(id)
  }, [state])

  // ── Loading state ────────────────────────────────────────────────────────────
  if (state === 'loading') {
    const takingLong = elapsed >= 20
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 bg-gray-900">
        <div className="w-10 h-10 border-4 border-white/20 border-t-white rounded-full animate-spin" />
        <p className="text-white/70 text-sm font-medium">กำลังสร้าง PDF...</p>
        {!takingLong ? (
          <p className="text-white/40 text-xs">
            อาจใช้เวลา 20–45 วินาที{elapsed > 0 ? ` (${elapsed}s)` : ''}
          </p>
        ) : (
          <div className="text-center">
            <p className="text-amber-400/80 text-xs font-medium">
              ใช้เวลานานกว่าปกติ ({elapsed}s)
            </p>
            <p className="text-white/40 text-xs mt-1">
              กำลังโหลด Chromium ครั้งแรก — รอสักครู่...
            </p>
          </div>
        )}
      </div>
    )
  }

  // ── Error state ──────────────────────────────────────────────────────────────
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

  // ── Ready: in-app PDF viewer (all platforms) ─────────────────────────────────
  return (
    <PdfViewer
      pdfUrl={pdfUrl}
      docLabel={docLabel}
      onFallback={() => window.open(pdfUrl, '_blank', 'noopener')}
    />
  )
}
