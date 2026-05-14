'use client'

import { useState } from 'react'
import { ArrowUpRight, ArrowDownLeft, RefreshCw, Gift, Zap, Clock } from 'lucide-react'
import type { CreditTransaction, CreditTransactionType } from '@/types'

const TYPE_CONFIG: Record<CreditTransactionType, {
  label: string
  Icon: React.ComponentType<{ className?: string }>
  color: string
}> = {
  grant:  { label: 'ได้รับฟรี',       Icon: Gift,          color: 'text-green-600 bg-green-50' },
  topup:  { label: 'เติมเครดิต',       Icon: ArrowUpRight,  color: 'text-blue-600 bg-blue-50' },
  spend:  { label: 'ใช้เครดิต',        Icon: ArrowDownLeft, color: 'text-red-500 bg-red-50' },
  reset:  { label: 'รีเซ็ตรายเดือน',  Icon: RefreshCw,     color: 'text-violet-600 bg-violet-50' },
  assign: { label: 'โอนเครดิต',        Icon: Zap,           color: 'text-amber-600 bg-amber-50' },
  expire: { label: 'หมดอายุ',          Icon: Clock,         color: 'text-gray-400 bg-gray-100' },
}

const PAGE = 15

interface Props {
  transactions: CreditTransaction[]
}

export default function TransactionHistory({ transactions }: Props) {
  const [page, setPage] = useState(0)
  const visible = transactions.slice(page * PAGE, (page + 1) * PAGE)
  const pages = Math.ceil(transactions.length / PAGE)

  if (transactions.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400 text-sm">
        ยังไม่มีประวัติการทำรายการ
      </div>
    )
  }

  return (
    <div>
      <div className="divide-y divide-gray-50">
        {visible.map(tx => {
          const cfg = TYPE_CONFIG[tx.type] ?? TYPE_CONFIG.spend
          const { Icon } = cfg
          const isPositive = tx.amount > 0

          return (
            <div
              key={tx.id}
              className="flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50/60 transition-colors"
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${cfg.color}`}>
                <Icon className="w-4 h-4" />
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 leading-snug truncate">
                  {tx.description ?? cfg.label}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {new Date(tx.created_at).toLocaleDateString('th-TH', {
                    year: 'numeric', month: 'short', day: 'numeric',
                    hour: '2-digit', minute: '2-digit',
                  })}
                </p>
              </div>

              <div className="text-right flex-shrink-0 tabular-nums">
                <p className={`text-sm font-bold ${isPositive ? 'text-green-600' : 'text-red-500'}`}>
                  {isPositive ? '+' : ''}{tx.amount}
                </p>
                <p className="text-[11px] text-gray-400 mt-0.5">คงเหลือ {tx.balance_after}</p>
              </div>
            </div>
          )
        })}
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-center gap-2 px-4 py-3 border-t border-gray-50">
          <button
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
            className="px-3 py-1 text-xs rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition"
          >
            ← ก่อน
          </button>
          <span className="text-xs text-gray-500">{page + 1} / {pages}</span>
          <button
            onClick={() => setPage(p => Math.min(pages - 1, p + 1))}
            disabled={page === pages - 1}
            className="px-3 py-1 text-xs rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition"
          >
            ถัดไป →
          </button>
        </div>
      )}
    </div>
  )
}
