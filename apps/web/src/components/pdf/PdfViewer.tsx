'use client'

import {
  useEffect, useRef, useState, useCallback, type CSSProperties,
} from 'react'
import { Download, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react'

export interface PdfViewerProps {
  pdfUrl: string
  docLabel: string
  onFallback?: () => void
}

interface PageInfo {
  width:  number
  height: number
}

const MIN_ZOOM   = 0.4
const MAX_ZOOM   = 4.0
const ZOOM_STEP  = 1.25
const PRELOAD_PX = 400

export default function PdfViewer({ pdfUrl, docLabel, onFallback }: PdfViewerProps) {
  // ── Mount guard: never render before hydration ──────────────────────────────
  // Prevents SSR mismatch and iOS Safari blank-layer bug on first paint.
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  const scrollRef = useRef<HTMLDivElement>(null)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfDocRef      = useRef<any>(null)
  const canvasRefs     = useRef(new Map<number, HTMLCanvasElement>())
  const renderedScale  = useRef(new Map<number, number>())
  const renderTasksRef = useRef(new Map<number, { cancel: () => void }>())

  const [viewState,   setViewState]   = useState<'loading' | 'ready' | 'error'>('loading')
  const [errorMsg,    setErrorMsg]    = useState<string | null>(null)
  const [pages,       setPages]       = useState<PageInfo[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [zoom,        setZoom]        = useState(1.0)
  const [fitScale,    setFitScale]    = useState(0)

  const effectiveScale = fitScale > 0 ? fitScale * zoom : 0

  // ── Load PDF ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!mounted) return
    let cancelled = false

    async function load() {
      try {
        const pdfjsLib = await import('pdfjs-dist')

        // Always set workerSrc — avoids stale cached worker on Safari.
        pdfjsLib.GlobalWorkerOptions.workerSrc =
          `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`

        const res = await fetch(pdfUrl)
        if (!res.ok) throw new Error(`HTTP ${res.status} จากที่เก็บไฟล์`)
        const buffer = await res.arrayBuffer()
        if (cancelled) return

        const doc = await pdfjsLib.getDocument({ data: buffer }).promise
        if (cancelled) return
        pdfDocRef.current = doc

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
        console.log('[PDFVIEW] loaded', { pages: infos.length, docLabel })
      } catch (err) {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ'
          setErrorMsg(msg)
          setViewState('error')
          console.warn('[PDFVIEW] load error', msg)
        }
      }
    }

    load()
    return () => { cancelled = true }
  }, [mounted, pdfUrl, docLabel])

  // ── fitScale: computed via ResizeObserver so it updates on any resize ────────
  // Runs once viewState=ready; stays in sync as container resizes (e.g. rotation).
  // Falls back to window.innerWidth when the ref isn't laid out yet.

  useEffect(() => {
    if (viewState !== 'ready' || pages.length === 0) return

    const pageW = pages[0]?.width ?? 595

    const compute = () => {
      const el = scrollRef.current
      let containerW: number
      if (el && el.clientWidth > 0) {
        containerW = el.clientWidth - 32        // 16px side padding × 2
      } else {
        containerW = (typeof window !== 'undefined' ? window.innerWidth : 400) - 32
      }
      const scale = Math.min(Math.max(containerW / pageW, MIN_ZOOM), 2.0)
      setFitScale(scale)
      console.log('[PDFVIEW] fitScale', { scale, containerW, pageW })
    }

    compute()

    if (!scrollRef.current) return
    const ro = new ResizeObserver(compute)
    ro.observe(scrollRef.current)
    return () => ro.disconnect()
  }, [viewState, pages])

  // ── Render a single page onto its canvas ─────────────────────────────────────

  const renderPage = useCallback(async (idx: number, scale: number) => {
    if (!pdfDocRef.current || scale <= 0) return
    const canvas = canvasRefs.current.get(idx)
    if (!canvas) return

    renderTasksRef.current.get(idx)?.cancel()
    renderTasksRef.current.delete(idx)

    try {
      const dpr = window.devicePixelRatio || 1
      const pg  = await pdfDocRef.current.getPage(idx + 1)
      const vp  = pg.getViewport({ scale: scale * dpr })

      canvas.width  = Math.round(vp.width)
      canvas.height = Math.round(vp.height)

      const ctx = canvas.getContext('2d')
      if (!ctx) { pg.cleanup(); return }

      const task = pg.render({ canvasContext: ctx, viewport: vp })
      renderTasksRef.current.set(idx, task)

      await task.promise
      renderedScale.current.set(idx, scale)
      pg.cleanup()
      console.log('[PDFVIEW] rendered page', idx, 'scale', scale.toFixed(3))
    } catch (err: unknown) {
      const name = (err as { name?: string })?.name
      if (name !== 'RenderingCancelledException') {
        console.warn('[PDFVIEW] page render error', idx, err)
      }
    } finally {
      renderTasksRef.current.delete(idx)
    }
  }, [])

  // ── IntersectionObserver: lazy page rendering ─────────────────────────────────

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
    console.log('[PDFVIEW] observer created', { effectiveScale: effectiveScale.toFixed(3), pages: pages.length, containerH: root.clientHeight })
    return () => observer.disconnect()
  }, [viewState, effectiveScale, renderPage, pages.length])

  // ── IntersectionObserver: current-page tracker ───────────────────────────────

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

  // ── Zoom ──────────────────────────────────────────────────────────────────────

  const applyZoom = useCallback((next: number) => {
    const clamped = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, next))
    setZoom(clamped)
    renderedScale.current.clear()
    renderTasksRef.current.forEach(task => task.cancel())
    renderTasksRef.current.clear()
  }, [])

  const zoomIn   = useCallback(() => applyZoom(zoom * ZOOM_STEP),  [zoom, applyZoom])
  const zoomOut  = useCallback(() => applyZoom(zoom / ZOOM_STEP),  [zoom, applyZoom])
  const fitWidth = useCallback(() => applyZoom(1.0),               [applyZoom])

  // ── Download ──────────────────────────────────────────────────────────────────

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

  const handleFallback = useCallback(() => {
    window.open(pdfUrl, '_blank', 'noopener')
    onFallback?.()
  }, [pdfUrl, onFallback])

  // ─── Render ───────────────────────────────────────────────────────────────────

  // Hold the spinner during SSR and the instant before mount — avoids flicker.
  if (!mounted || viewState === 'loading') {
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

  // ── Ready ─────────────────────────────────────────────────────────────────────

  const zoomPct = Math.round(zoom * 100)

  return (
    // Outer: fill the remaining flex space granted by the preview page wrapper.
    // IMPORTANT: do NOT add overflow:hidden here — on iOS Safari it creates an
    // empty GPU compositing layer over the child scroll container, making it
    // appear blank. Let the scroll area manage its own overflow.
    <div className="flex-1 flex flex-col min-h-0 bg-gray-800">

      {/* ── Toolbar ─────────────────────────────────────────────────────────── */}
      <div
        className="flex items-center gap-1 px-3 py-2 bg-gray-900 border-b border-white/10 flex-shrink-0"
        style={{ minHeight: 44 }}
      >
        <span className="text-white/40 text-xs tabular-nums select-none" style={{ minWidth: '4.5rem' }}>
          หน้า {currentPage} / {pages.length}
        </span>

        <div className="w-px h-4 bg-white/15 mx-1 flex-shrink-0" />

        <button
          onClick={zoomOut}
          disabled={zoom <= MIN_ZOOM}
          aria-label="ย่อ"
          className="p-1.5 rounded text-white/60 hover:text-white hover:bg-white/10 disabled:opacity-30 transition touch-manipulation"
        >
          <ZoomOut className="w-4 h-4" />
        </button>

        <span
          className="text-white/40 text-xs tabular-nums select-none"
          style={{ minWidth: '3.5rem', textAlign: 'center' }}
        >
          {zoomPct}%
        </span>

        <button
          onClick={zoomIn}
          disabled={zoom >= MAX_ZOOM}
          aria-label="ขยาย"
          className="p-1.5 rounded text-white/60 hover:text-white hover:bg-white/10 disabled:opacity-30 transition touch-manipulation"
        >
          <ZoomIn className="w-4 h-4" />
        </button>

        <button
          onClick={fitWidth}
          aria-label="พอดีหน้าจอ"
          title="พอดีความกว้างหน้าจอ"
          className="p-1.5 rounded text-white/60 hover:text-white hover:bg-white/10 transition touch-manipulation"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>

        <div className="flex-1" />

        <button
          onClick={handleDownload}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-xs font-semibold rounded-lg transition touch-manipulation"
        >
          <Download className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="hidden sm:inline">ดาวน์โหลด</span>
        </button>
      </div>

      {/* ── Scroll area ──────────────────────────────────────────────────────── */}
      {/*
       * scroll container rules:
       *  - flex-1 + min-h-0: fills remaining height without growing past parent
       *  - overflow-y: auto  → vertical scroll when content taller than container
       *  - overflow-x: auto  → horizontal scroll when zoomed wider than container
       *  - overscroll-behavior: contain → stops scroll chaining to the document on
       *    desktop trackpads and prevents iOS rubber-band from bouncing the page
       *  - WebkitOverflowScrolling: touch → momentum scrolling on iOS < 13
       *    (harmless no-op on modern iOS which enables this by default)
       */}
      <div
        ref={scrollRef}
        className="flex-1 min-h-0"
        style={{
          overflowY: 'auto',
          overflowX: 'auto',
          overscrollBehavior: 'contain',
          WebkitOverflowScrolling: 'touch',
        } as CSSProperties}
      >
        <div className="flex flex-col items-center gap-4 py-4 px-4 pb-10">
          {pages.map((pg, idx) => {
            const w = effectiveScale > 0 ? Math.round(pg.width  * effectiveScale) : Math.round(pg.width)
            const h = effectiveScale > 0 ? Math.round(pg.height * effectiveScale) : Math.round(pg.height)

            return (
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
