import type { AiQuotaInfo } from '@/lib/aiQuota'

export function AiQuotaBadge({ used, limit }: AiQuotaInfo) {
  const remaining = limit - used
  const pct = limit > 0 ? (used / limit) * 100 : 100
  const color = pct >= 90 ? 'text-red-500' : pct >= 70 ? 'text-amber-500' : 'text-emerald-600'
  return (
    <span className={`text-xs font-medium ${color}`}>
      {remaining}/{limit} AI เหลือ
    </span>
  )
}
