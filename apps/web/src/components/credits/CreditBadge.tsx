'use client'

import Link from 'next/link'
import { Zap } from 'lucide-react'

interface Props {
  balance: number
}

export default function CreditBadge({ balance }: Props) {
  const low = balance <= 2
  return (
    <Link
      href="/credits"
      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-bold transition hover:opacity-80 ${
        low
          ? 'bg-red-50 text-red-600 border border-red-100'
          : 'bg-blue-50 text-blue-700 border border-blue-100'
      }`}
    >
      <Zap className="w-3.5 h-3.5" />
      <span className="tabular-nums">{balance}</span>
    </Link>
  )
}
