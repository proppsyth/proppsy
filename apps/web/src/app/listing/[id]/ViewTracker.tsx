'use client'

import { useEffect } from 'react'

export default function ViewTracker({ stockId }: { stockId: string }) {
  useEffect(() => {
    const key = `psy_viewed_${stockId}`
    if (sessionStorage.getItem(key)) return
    sessionStorage.setItem(key, '1')
    fetch(`/api/stock/${stockId}/view`, { method: 'POST' }).catch(() => {})
  }, [stockId])
  return null
}
