'use client'
import { useState, useEffect, useCallback } from 'react'
import { getAiQuota } from '@/lib/aiQuota'
import type { AiQuotaInfo } from '@/lib/aiQuota'

export function useAiQuota() {
  const [quota, setQuota] = useState<AiQuotaInfo | null>(null)

  const refresh = useCallback(() => {
    getAiQuota().then(setQuota).catch(() => {})
  }, [])

  useEffect(() => { refresh() }, [refresh])

  const isExhausted = quota !== null && quota.used >= quota.limit

  return { quota, refresh, isExhausted }
}
