'use client'

/**
 * PdfViewer — in-app PDF renderer using PDF.js (pdfjs-dist).
 *
 * Architecture:
 *  - pdfjs-dist is loaded via dynamic `import()` inside useEffect — never
 *    bundled into the main JS chunk; only downloads on preview pages.
 *  - Pages render lazily via IntersectionObserver; off-screen pages are
 *    sized placeholder divs until they scroll into view.
 *  - When zoom changes, the IntersectionObserver is re-created so visible
 *    pages re-render at the new scale immediately; off-screen pages render
 *    at the new scale when scrolled to.
 *  - Any unrecoverable error calls onFallback() so the caller can open
 *    the PDF in a new tab without crashing the page.
 *
 * Extensibility:
 *  - Each page wrapper has `data-page={idx}` — annotation/highlight/signature
 *    overlays can be absolutely-positioned inside it using the same coordinate system.
 *  - pdfDocRef holds the raw pdfjs PDFDocumentProxy for future text extraction,
 *    search, form-field reading, or annotation parsing.
 */

import {
  useEffect, useRef, useState, useCallback, type CSSProperties,
} from 'react'
import { Download, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react'

// ─── Public types ─────────────────────────────────────────────────────────────

export interface PdfViewerProps {
  /** Supabase signed URL to the generated PDF. */
  pdfUrl: string
  /** Used as the filename when the user downloads. */
  docLabel: string
  /** Called when PDF.js fails unrecoverably and we open a new tab instead. */
  onFallback?: () => void
}

interface PageInfo {
  width:  number  // page width in PDF user-space units at scale=1
  height: number
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MIN_ZOOM   = 0.4
const MAX_ZOOM   = 4.0
const ZOOM_STEP  = 1.25
const PRELOAD_PX = 400    // rootMargin to pre-render pages before they're visible

// ─── Component ────────────────────────────────────────────────────────────────

export default function PdfViewer({ pdfUrl, docLabel, onFallback }: PdfViewerProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  // Refs — mutated without triggering re-renders
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfDocRef      = useRef<any>(null)
  const canvasRefs     = useRef(new Map<number, HTMLCanvasElement>())
  const renderedScale  = useRef(new Map<number, number>())      // idx → scale of last completed render
  const renderTasksRef = useRef(new Map<number, { cancel: () => void }>())

  // State
  const [viewState,   setViewState]   = useState<'loading' | 'ready' | 'error'>('loading')
  const [errorMsg,    setErrorMsg]    = useState<string | null>(null)
  const [pages,       setPages]       = useState<PageInfo[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [zoom,        setZoom]        = useState(1.0)
  // fitScale: CSS-px per PDF-user-unit at zoom=1. 0 = not yet computed (blocks rendering).
  const [fitScale, setFitScale]       = useState(0)

  // Derived — the actual CSS/render scale applied to every page
  const effectiveScale = fitScale > 0 ? fitScale * zoom : 0

  // ── Load PDF ────────────────────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        // Dynamic import: keeps pdfjs-dist out of the global bundle.
        // Next.js code-splits this into a separate chunk fetched on demand.
        const pdfjsLib = await import('pdfjs-dist')

        // Worker: CDN-hosted, version-matched to the installed package.
        // Using pdfjsLib.version avoids mismatches between library and worker.
        if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
          pdfjsLib.GlobalWorkerOptions.workerSrc =
            `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`
        }

        const res = await fetch(pdfUrl)
        if (!res.ok) throw new Error(`HTTP ${res.status} จากที่เก็บไฟล์`)
        const buffer = await res.arrayBuffer()
        if (cancelled) return

        const doc = await pdfjsLib.getDocument({ data: buffer }).promise
        if (cancelled) return
        pdfDocRef.current = doc

        // Collect page dimensions — fast, reads metadata only (no rendering)
        const infos: PageInfo[] = []
        for (let n = 1; n <= doc.numPages; n++) {
          const pg = await doc.getPage(n)
          const vp = pg.getViewport({ scale: 1 })
          infos.push({ width: vp.width, height: vp.height })
          pg.cleanup()
        }

        if (cancelled) return
        setPages(infos)
        setViewState('ready')

        // Compute fit-to-width scale once the scroll container is in the DOM
        requestAnimationFrame(() => {
          if (cancelled || !scrollRef.current) return
          const containerW = scrollRef.current.clientWidth - 32  // 16px padding × 2
          const pageW      = infos[0]?.width ?? 595
          setFitScale(Math.min(Math.max(containerW / pageW, 0.4), 2.0))
        })
      } catch (err) {
        if (!cancelled) {
          setErrorMsg(err instanceof Error ? err.message : 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ')
          setViewState('error')
        }
      }
    }

    load()
    return () => { cancelled = true }
  }, [pdfUrl])

  // ── Render a single page onto its canvas ────────────────────────────────────

  const renderPage = useCallback(async (idx: number, scale: number) => {
    if (!pdfDocRef.current || scale <= 0) return
    const canvas = canvasRefs.current.get(idx)
    if (!canvas) return

    // Cancel any in-progress render for this page (e.g. from a superseded zoom level)
    renderTasksRef.current.get(idx)?.cancel()
    renderTasksRef.current.delete(idx)

    try {
      const dpr = window.devicePixelRatio || 1
      const pg  = await pdfDocRef.current.getPage(idx + 1)
      const vp  = pg.getViewport({ scale: scale * dpr })

      // Physical pixel dimensions of the canvas buffer
      canvas.width  = Math.round(vp.width)
      canvas.height = Math.round(vp.height)

      const ctx = canvas.getContext('2d')
      if (!ctx) { pg.cleanup(); return }

      const task = pg.render({ canvasContext: ctx, viewport: vp })
      renderTasksRef.current.set(idx, task)

      await task.promise
      renderedScale.current.set(idx, scale)
      pg.cleanup()
    } catch (err: unknown) {
      const name = (err as { name?: string })?.name
      if (name !== 'RenderingCancelledException') {
        console.warn('[PdfViewer] page render error', idx, err)
      }
    } finally {
      renderTasksRef.current.delete(idx)
    }
  }, []) // no deps — accesses only refs

  // ── IntersectionObserver: lazy page rendering ────────────────────────────────
  // Re-created whenever effectiveScale changes so visible pages immediately
  // re-render at the new zoom level; off-screen pages render on scroll.

  useEffect(() => {
    if (viewState !== 'ready' || effectiveScale <= 0 || !scrollRef.current) return

    const root     = scrollRef.current
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue
        const idx       = Number((entry.target as HTMLElement).dataset.page)
        const lastScale = renderedScale.current.get(idx) ?? -1
        if (Math.abs(lastScale - effectiveScale) > 0.005) {
          renderPage(idx, effectiveScale)
        }
      }
    }, {
      root,
      rootMargin: `${PRELOAD_PX}px 0px`,
      threshold:  0,
    })

    root.querySelectorAll<HTMLElement>('[data-page]').forEach(el => observer.observe(el))
    return () => observer.disconnect()
  }, [viewState, effectiveScale, renderPage])

  // ── IntersectionObserver: current-page tracker ──────────────────────────────

  useEffect(() => {
    if (viewState !== 'ready' || !scrollRef.current) return

    const obs = new IntersectionObserver((entries) => {
      let best: { ratio: number; page: number } | null = null
      for (const e of entries) {
        if (e.isIntersecting && (!best || e.intersectionRatio > best.ratio)) {
          best = { ratio: e.intersectionRatio, page: Number((e.target as HTMLElement).dataset.page) + 1 }
        }
      }
      if (best) setCurrentPage(best.page)
    }, { root: scrollRef.current, threshold: [0.01, 0.3, 0.6] })

    scrollRef.current.querySelectorAll('[data-page]').forEach(el => obs.observe(el))
    return () => obs.disconnect()
  }, [viewState, pages])

  // ── Zoom ─────────────────────────────────────────────────────────────────────

  const applyZoom = useCallback((next: number) => {
    const clamped = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, next))
    setZoom(clamped)
    // Invalidate render-scale cache → the new observer fires visible pages at new scale
    renderedScale.current.clear()
    // Cancel renders that were in progress at the old scale
    renderTasksRef.current.forEach(task => task.cancel())
    renderTasksRef.current.clear()
  }, [])

  const zoomIn   = useCallback(() => applyZoom(zoom * ZOOM_STEP),  [zoom, applyZoom])
  const zoomOut  = useCallback(() => applyZoom(zoom / ZOOM_STEP),  [zoom, applyZoom])
  const fitWidth = useCallback(() => applyZoom(1.0),               [applyZoom])

  // ── Download ─────────────────────────────────────────────────────────────────

  const handleDownload = useCallback(async () => {
    try {
      const res  = await fetch(pdfUrl)
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = Object.assign(document.createElement('a'), {
        href:     url,
        download: `${docLabel}.pdf`,
      })
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      setTimeout(() => URL.revokeObjectURL(url), 10_000)
    } catch {
      window.open(pdfUrl, '_blank', 'noopener')
    }
  }, [pdfUrl, docLabel])

  // ── Fallback ──────────────────────────────────────────────────────────────────

  const handleFallback = useCallback(() => {
    window.open(pdfUrl, '_blank', 'noopener')
    onFallback?.()
  }, [pdfUrl, onFallback])

  // ─── Render ───────────────────────────────────────────────────────────────────

  if (viewState === 'loading') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 bg-gray-900">
        <div className="w-8 h-8 border-4 border-white/20 border-t-white rounded-full animate-spin" />
        <p className="text-white/60 text-sm">กำลังโหลดเอกสาร...</p>
      </div>
    )
  }

  if (viewState === 'error') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 bg-gray-900 px-6 text-center">
        <p className="text-3xl">⚠️</p>
        <p className="text-white font-semibold text-sm">เปิดเอกสารไม่สำเร็จ</p>
        {errorMsg && <p className="text-white/50 text-xs max-w-xs">{errorMsg}</p>}
        <button
          onClick={handleFallback}
          className="px-5 py-2.5 bg-white text-gray-900 text-sm font-semibold rounded-xl hover:bg-gray-100 transition mt-1"
        >
          เปิดในแท็บใหม่
        </button>
      </div>
    )
  }

  // ── Ready: toolbar + scrollable page area ─────────────────────────────────────

  const zoomPct = Math.round(zoom * 100)

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-gray-800 overflow-hidden">

      {/* ── Toolbar ─────────────────────────────────────────────────────────── */}
      <div
        className="flex items-center gap-1 px-3 py-2 bg-gray-900 border-b border-white/10 flex-shrink-0"
        style={{ minHeight: 44 }}
      >
        {/* Page counter */}
        <span className="text-white/40 text-xs tabular-nums select-none" style={{ minWidth: '4.5rem' }}>
          หน้า {currentPage} / {pages.length}
        </span>

        <div className="w-px h-4 bg-white/15 mx-1 flex-shrink-0" />

        {/* Zoom out */}
        <button
          onClick={zoomOut}
          disabled={zoom <= MIN_ZOOM}
          aria-label="ย่อ"
          className="p-1.5 rounded text-white/60 hover:text-white hover:bg-white/10 disabled:opacity-30 transition touch-manipulation"
        >
          <ZoomOut className="w-4 h-4" />
        </button>

        {/* Zoom level */}
        <span
          className="text-white/40 text-xs tabular-nums select-none"
          style={{ minWidth: '3.5rem', textAlign: 'center' }}
        >
          {zoomPct}%
        </span>

        {/* Zoom in */}
        <button
          onClick={zoomIn}
          disabled={zoom >= MAX_ZOOM}
          aria-label="ขยาย"
          className="p-1.5 rounded text-white/60 hover:text-white hover:bg-white/10 disabled:opacity-30 transition touch-manipulation"
        >
          <ZoomIn className="w-4 h-4" />
        </button>

        {/* Fit width */}
        <button
          onClick={fitWidth}
          aria-label="พอดีหน้าจอ"
          title="พอดีความกว้างหน้าจอ"
          className="p-1.5 rounded text-white/60 hover:text-white hover:bg-white/10 transition touch-manipulation"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>

        <div className="flex-1" />

        {/* Download */}
        <button
          onClick={handleDownload}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-xs font-semibold rounded-lg transition touch-manipulation"
        >
          <Download className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="hidden sm:inline">ดาวน์โหลด</span>
        </button>
      </div>

      {/* ── Scroll area ──────────────────────────────────────────────────────── */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-auto"
        // Momentum scrolling on iOS Safari
        style={{ WebkitOverflowScrolling: 'touch' } as CSSProperties}
      >
        <div className="flex flex-col items-center gap-4 py-4 px-4">
          {pages.map((pg, idx) => {
            const w = effectiveScale > 0 ? Math.round(pg.width  * effectiveScale) : Math.round(pg.width)
            const h = effectiveScale > 0 ? Math.round(pg.height * effectiveScale) : Math.round(pg.height)

            return (
              /*
               * Page wrapper:
               *  - Controls the displayed CSS size of the page
               *  - Is the target element for both IntersectionObservers
               *  - data-page={idx} is the shared key for all ref maps
               *  - position:relative is the anchor for future annotation overlays
               */
              <div
                key={idx}
                data-page={idx}
                style={{
                  width:           w,
                  height:          h,
                  maxWidth:        '100%',
                  flexShrink:      0,
                  position:        'relative',
                  backgroundColor: '#ffffff',
                  boxShadow:       '0 2px 16px rgba(0,0,0,0.45)',
                  borderRadius:    2,
                  overflow:        'hidden',
                }}
              >
                {/*
                 * Canvas:
                 *  - CSS size = 100% of the wrapper above (controlled by effectiveScale)
                 *  - Physical pixel size = page.width * effectiveScale * devicePixelRatio
                 *    (set inside renderPage() for HiDPI sharpness)
                 *  - canvas.width=N clearing is handled internally in renderPage
                 */}
                <canvas
                  ref={el => {
                    if (el) canvasRefs.current.set(idx, el)
                    else    canvasRefs.current.delete(idx)
                  }}
                  style={{ width: '100%', height: '100%', display: 'block' }}
                />
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
