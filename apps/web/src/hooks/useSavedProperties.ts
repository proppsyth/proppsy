'use client'

import { useState, useCallback, useEffect } from 'react'

const KEY = 'proppsy_saved'

export function useSavedProperties() {
  const [saved, setSaved] = useState<string[]>([])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY)
      setSaved(raw ? JSON.parse(raw) : [])
    } catch { setSaved([]) }
  }, [])

  const toggle = useCallback((id: string) => {
    setSaved(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
      try { localStorage.setItem(KEY, JSON.stringify(next)) } catch {}
      return next
    })
  }, [])

  const isSaved = useCallback((id: string) => saved.includes(id), [saved])

  return { saved, toggle, isSaved }
}
