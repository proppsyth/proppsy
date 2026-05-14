'use client'

import { useEffect, useState } from 'react'

const R = 52                        // SVG radius
const C = 2 * Math.PI * R           // ≈ 326.7 — full circumference
const STROKE = 9

interface Props {
  balance: number
  total: number   // plan quota or total_earned (used as gauge max)
  size?: number
}

export default function CreditGauge({ balance, total, size = 148 }: Props) {
  const pct = total > 0 ? Math.min(balance / total, 1) : 0
  const [drawn, setDrawn] = useState(0)

  // Animate arc in on mount
  useEffect(() => {
    const id = requestAnimationFrame(() => setTimeout(() => setDrawn(pct), 50))
    return () => cancelAnimationFrame(id)
  }, [pct])

  const offset = C * (1 - drawn)
  const arcColor =
    pct > 0.5 ? '#3b82f6'   // blue — healthy
    : pct > 0.2 ? '#f59e0b' // amber — low
    : '#ef4444'              // red — critical

  return (
    <div className="flex flex-col items-center gap-2 select-none">
      <div style={{ width: size, height: size }} className="relative">
        {/* Rotated 90° so arc starts at the top */}
        <svg
          width={size}
          height={size}
          viewBox="0 0 120 120"
          style={{ transform: 'rotate(-90deg)' }}
        >
          {/* Track */}
          <circle
            cx="60" cy="60" r={R}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth={STROKE}
          />
          {/* Progress arc */}
          <circle
            cx="60" cy="60" r={R}
            fill="none"
            stroke={arcColor}
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={C}
            strokeDashoffset={offset}
            style={{
              transition: 'stroke-dashoffset 1s cubic-bezier(0.4,0,0.2,1), stroke 0.4s ease',
            }}
          />
        </svg>

        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
          <span
            className="tabular-nums font-bold leading-none"
            style={{ fontSize: size * 0.18, color: arcColor }}
          >
            {balance}
          </span>
          <span className="text-xs text-gray-400 leading-none">/ {total}</span>
        </div>
      </div>

      <div className="text-center">
        <p className="text-sm font-semibold text-gray-700">เครดิตคงเหลือ</p>
        <p className="text-xs text-gray-400">1 เครดิต = 20 บาท</p>
      </div>
    </div>
  )
}
