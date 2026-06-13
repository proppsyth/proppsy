'use client'

import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import type { StockWithProject } from '@/app/listing/PropertyCard'

const MAX = 3
const KEY = 'proppsy_compare'

interface CompareCtx {
  items: StockWithProject[]
  isComparing: (id: string) => boolean
  toggle: (stock: StockWithProject) => void
  clear: () => void
  isFull: boolean
}

const Ctx = createContext<CompareCtx | null>(null)

export function CompareProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<StockWithProject[]>([])

  useEffect(() => {
    try {
      const saved = localStorage.getItem(KEY)
      if (saved) setItems(JSON.parse(saved))
    } catch {}
  }, [])

  const toggle = useCallback((stock: StockWithProject) => {
    setItems(prev => {
      const exists = prev.some(i => i.id === stock.id)
      const next = exists
        ? prev.filter(i => i.id !== stock.id)
        : prev.length >= MAX ? prev : [...prev, stock]
      try { localStorage.setItem(KEY, JSON.stringify(next)) } catch {}
      return next
    })
  }, [])

  const clear = useCallback(() => {
    setItems([])
    try { localStorage.removeItem(KEY) } catch {}
  }, [])

  return (
    <Ctx.Provider value={{ items, isComparing: id => items.some(i => i.id === id), toggle, clear, isFull: items.length >= MAX }}>
      {children}
    </Ctx.Provider>
  )
}

export function useCompare() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useCompare requires CompareProvider')
  return ctx
}
