'use client'

import {
  useState, useEffect, useRef, useCallback, useTransition,
} from 'react'
import { createPortal } from 'react-dom'
import {
  Search, X, ChevronDown, Loader2,
  Building2, User, Home,
} from 'lucide-react'
import type {
  StockSearchResult, OwnerSearchResult, CustomerSearchResult, EntitySearchResult,
} from '@/app/(protected)/contracts/search-actions'

// ─── Types ───────────────────────────────────────────────────

type EntityKind = 'stock' | 'owner' | 'customer'

interface StockProps {
  kind: 'stock'
  value: string
  selectedLabel?: string
  onSelect: (result: StockSearchResult | null) => void
  searchFn: (q: string) => Promise<StockSearchResult[]>
  placeholder?: string
}

interface OwnerProps {
  kind: 'owner'
  value: string
  selectedLabel?: string
  onSelect: (result: OwnerSearchResult | null) => void
  searchFn: (q: string) => Promise<OwnerSearchResult[]>
  placeholder?: string
}

interface CustomerProps {
  kind: 'customer'
  value: string
  selectedLabel?: string
  onSelect: (result: CustomerSearchResult | null) => void
  searchFn: (q: string) => Promise<CustomerSearchResult[]>
  placeholder?: string
}

type Props = StockProps | OwnerProps | CustomerProps

// ─── Helpers ─────────────────────────────────────────────────

function fmt(n: number) {
  return new Intl.NumberFormat('th-TH').format(n)
}

function stockLabel(r: StockSearchResult): string {
  return [r.project_name, r.unit_no, r.room_type].filter(Boolean).join(' · ') || r.id
}

function stockSub(r: StockSearchResult): string {
  const parts: string[] = []
  if (r.building) parts.push(`อาคาร ${r.building}`)
  if (r.floor != null) parts.push(`ชั้น ${r.floor}`)
  if (r.rent_price) parts.push(`฿${fmt(r.rent_price)}/เดือน`)
  return parts.join(' • ')
}

const STATUS_TH: Record<string, string> = {
  available: 'ว่าง', rented: 'เช่าแล้ว', sold: 'ขายแล้ว', unavailable: 'ไม่ว่าง',
}
const STATUS_COLOR: Record<string, string> = {
  available: 'bg-green-100 text-green-700',
  rented: 'bg-blue-100 text-blue-700',
  sold: 'bg-purple-100 text-purple-700',
  unavailable: 'bg-gray-100 text-gray-500',
}

function personLabel(r: OwnerSearchResult | CustomerSearchResult): string {
  if (r.nickname) return r.nickname
  return [r.first_name_th, r.last_name_th].filter(Boolean).join(' ') || r.id
}

// ─── Dropdown portal ─────────────────────────────────────────

interface DropdownProps {
  triggerRef: React.RefObject<HTMLDivElement | null>
  open: boolean
  children: React.ReactNode
}

function DropdownPortal({ triggerRef, open, children }: DropdownProps) {
  const [rect, setRect] = useState<DOMRect | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (!open || !triggerRef.current) return
    function update() {
      if (triggerRef.current) setRect(triggerRef.current.getBoundingClientRect())
    }
    update()
    window.addEventListener('scroll', update, true)
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update, true)
      window.removeEventListener('resize', update)
    }
  }, [open, triggerRef])

  if (!mounted || !open || !rect) return null

  // On small screens render as fixed bottom sheet
  const isMobile = window.innerWidth < 640
  if (isMobile) {
    return createPortal(
      <>
        <div className="fixed inset-0 z-[9998] bg-black/40" />
        {children}
      </>,
      document.body,
    )
  }

  const dropdownStyle: React.CSSProperties = {
    position: 'fixed',
    top: rect.bottom + 4,
    left: rect.left,
    width: rect.width,
    zIndex: 9999,
  }

  return createPortal(
    <div style={dropdownStyle}>
      {children}
    </div>,
    document.body,
  )
}

// ─── Result rows ─────────────────────────────────────────────

function StockRow({ r, selected, onSelect }: { r: StockSearchResult; selected: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      onPointerDown={e => { e.preventDefault(); onSelect() }}
      className={`w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-blue-50 transition cursor-pointer ${selected ? 'bg-blue-50' : ''}`}
    >
      <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Home className="w-4 h-4 text-blue-600" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-sm font-medium truncate ${selected ? 'text-blue-700' : 'text-gray-900'}`}>
            {stockLabel(r)}
          </span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 ${STATUS_COLOR[r.status] ?? 'bg-gray-100 text-gray-500'}`}>
            {STATUS_TH[r.status] ?? r.status}
          </span>
        </div>
        {stockSub(r) && (
          <p className="text-xs text-gray-400 mt-0.5 truncate">{stockSub(r)}</p>
        )}
        <p className="text-[10px] text-gray-300 mt-0.5">{r.id}</p>
      </div>
    </button>
  )
}

function PersonRow({
  r, selected, onSelect,
}: {
  r: OwnerSearchResult | CustomerSearchResult
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onPointerDown={e => { e.preventDefault(); onSelect() }}
      className={`w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-blue-50 transition cursor-pointer ${selected ? 'bg-blue-50' : ''}`}
    >
      <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center flex-shrink-0">
        <User className="w-4 h-4 text-violet-600" />
      </div>
      <div className="flex-1 min-w-0">
        <span className={`text-sm font-medium truncate block ${selected ? 'text-blue-700' : 'text-gray-900'}`}>
          {personLabel(r)}
        </span>
        <div className="flex items-center gap-2 mt-0.5">
          {r.phone && <span className="text-xs text-gray-400">{r.phone}</span>}
          <span className="text-[10px] text-gray-300">{r.id}</span>
        </div>
      </div>
    </button>
  )
}

// ─── Main component ───────────────────────────────────────────

export default function EntityCombobox(props: Props) {
  const { kind, value, selectedLabel, placeholder, searchFn } = props

  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<EntitySearchResult[]>([])
  const [activeIdx, setActiveIdx] = useState(-1)
  const [isPending, startTransition] = useTransition()
  const [hasSearched, setHasSearched] = useState(false)

  const triggerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const runSearch = useCallback((q: string) => {
    setHasSearched(false)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      startTransition(async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const res = await (searchFn as any)(q)
        setResults(res)
        setHasSearched(true)
        setActiveIdx(-1)
      })
    }, 250)
  }, [searchFn])

  function openDropdown() {
    setOpen(true)
    setQuery('')
    setResults([])
    setHasSearched(false)
    setActiveIdx(-1)
    runSearch('')
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  function closeDropdown() {
    setOpen(false)
    setQuery('')
    setActiveIdx(-1)
  }

  function handleQueryChange(q: string) {
    setQuery(q)
    runSearch(q)
  }

  function handleSelect(result: EntitySearchResult) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(props.onSelect as any)(result)
    closeDropdown()
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(props.onSelect as any)(null)
    closeDropdown()
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') { closeDropdown(); return }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIdx(i => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIdx(i => Math.max(i - 1, -1))
    } else if (e.key === 'Enter' && activeIdx >= 0) {
      e.preventDefault()
      const r = results[activeIdx]
      if (r) handleSelect(r)
    }
  }

  // Scroll active item into view
  useEffect(() => {
    if (activeIdx < 0 || !listRef.current) return
    const el = listRef.current.querySelector(`[data-idx="${activeIdx}"]`) as HTMLElement | null
    el?.scrollIntoView({ block: 'nearest' })
  }, [activeIdx])

  // Close on outside pointer (works for mouse and touch)
  useEffect(() => {
    if (!open) return
    function onDown(e: PointerEvent) {
      if (triggerRef.current?.contains(e.target as Node)) return
      const portals = document.querySelectorAll('[data-entity-portal]')
      for (const p of portals) {
        if (p.contains(e.target as Node)) return
      }
      closeDropdown()
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [open])

  // Derive display label for selected item
  const displayLabel = selectedLabel || (value ? value : '')
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640

  const emptyIcon = kind === 'stock' ? <Building2 className="w-8 h-8 text-gray-200" /> : <User className="w-8 h-8 text-gray-200" />
  const emptyHint = kind === 'stock'
    ? 'ค้นหาด้วยชื่อโครงการ, ห้อง, อาคาร'
    : 'ค้นหาด้วยชื่อ, เบอร์โทร'

  // ─── Dropdown content ───────────────────────────────────────

  const dropdownContent = (
    <div
      data-entity-portal
      className={`
        bg-white rounded-2xl border border-gray-200 shadow-2xl overflow-hidden flex flex-col
        ${isMobile ? 'fixed inset-x-2 bottom-16 z-[9999] max-h-[65vh]' : 'max-h-[min(400px,60vh)]'}
      `}
    >
      {/* Search input */}
      <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2.5 flex-shrink-0">
        {isPending
          ? <Loader2 className="w-4 h-4 text-blue-500 animate-spin flex-shrink-0" />
          : <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
        }
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => handleQueryChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            kind === 'stock' ? 'ค้นหาโครงการ, ห้อง, อาคาร...' :
            kind === 'owner' ? 'ค้นหาเจ้าของทรัพย์...' :
            'ค้นหาลูกค้า / ผู้เช่า...'
          }
          className="flex-1 text-sm outline-none bg-transparent placeholder:text-gray-400"
        />
        {isMobile && (
          <button
            type="button"
            onPointerDown={e => { e.preventDefault(); closeDropdown() }}
            className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 flex-shrink-0"
          >
            ยกเลิก
          </button>
        )}
      </div>

      {/* Results list */}
      <div ref={listRef} className="overflow-y-auto flex-1">
        {/* Clear / deselect option */}
        {value && (
          <button
            type="button"
            onPointerDown={e => { e.preventDefault(); handleClear(e) }}
            className="w-full text-left px-4 py-2.5 text-sm text-gray-400 hover:bg-gray-50 border-b border-gray-50 transition"
          >
            — ยกเลิกการเลือก —
          </button>
        )}

        {/* Loading first search */}
        {isPending && results.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 text-gray-300">
            <Loader2 className="w-6 h-6 animate-spin mb-2" />
            <p className="text-sm">กำลังค้นหา...</p>
          </div>
        )}

        {/* Empty state */}
        {!isPending && hasSearched && results.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 text-center px-4">
            {emptyIcon}
            <p className="text-sm text-gray-400 mt-2">
              {query ? `ไม่พบ "${query}"` : 'ยังไม่มีข้อมูล'}
            </p>
            <p className="text-xs text-gray-300 mt-1">{emptyHint}</p>
          </div>
        )}

        {/* Results */}
        {results.map((r, i) => (
          <div key={r.id} data-idx={i}>
            {r.kind === 'stock' ? (
              <StockRow
                r={r}
                selected={i === activeIdx || r.id === value}
                onSelect={() => handleSelect(r)}
              />
            ) : (
              <PersonRow
                r={r}
                selected={i === activeIdx || r.id === value}
                onSelect={() => handleSelect(r)}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <div ref={triggerRef} className="relative">
      {/* Trigger */}
      <div
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        tabIndex={0}
        onClick={() => open ? closeDropdown() : openDropdown()}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDropdown() } }}
        className={`
          w-full flex items-center gap-2 px-3 py-2.5 border rounded-xl text-sm bg-white cursor-pointer
          transition select-none
          ${open ? 'border-blue-500 ring-2 ring-blue-100' : 'border-gray-200 hover:border-gray-300'}
        `}
      >
        {value ? (
          <>
            <span className="flex-1 truncate text-gray-900 font-medium">{displayLabel}</span>
            <button
              type="button"
              onClick={handleClear}
              className="text-gray-400 hover:text-gray-600 flex-shrink-0 p-0.5 rounded-full hover:bg-gray-100 transition"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </>
        ) : (
          <>
            <Search className="w-4 h-4 text-gray-300 flex-shrink-0" />
            <span className="flex-1 text-gray-400">{placeholder ?? 'ค้นหา...'}</span>
            <ChevronDown className={`w-4 h-4 text-gray-300 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
          </>
        )}
      </div>

      {/* Portal dropdown */}
      <DropdownPortal triggerRef={triggerRef} open={open}>
        {dropdownContent}
      </DropdownPortal>
    </div>
  )
}
