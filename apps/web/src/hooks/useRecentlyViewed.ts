'use client'

import { useState, useCallback, useEffect } from 'react'

const KEY = 'proppsy_recent'
const MAX = 10

export interface RecentProperty {
  id: string
  project_name?: string
  unit_no?: string
  room_type?: string
  rent_price?: number | null
  sale_price?: number | null
  listing_type?: string
  photo_thumb_url?: string
}

export function useRecentlyViewed() {
  const [recent, setRecent] = useState<RecentProperty[]>([])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY)
      setRecent(raw ? JSON.parse(raw) : [])
    } catch { setRecent([]) }
  }, [])

  const addProperty = useCallback((prop: RecentProperty) => {
    setRecent(prev => {
      const filtered = prev.filter(p => p.id !== prop.id)
      const next = [prop, ...filtered].slice(0, MAX)
      try { localStorage.setItem(KEY, JSON.stringify(next)) } catch {}
      return next
    })
  }, [])

  return { recent, addProperty }
}
