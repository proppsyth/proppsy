'use client'

import { useState, useEffect, useRef } from 'react'
import { FileText, User, Home, ClipboardList } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export interface StatItem {
  value: number
  label: string
  unit: string
  icon: LucideIcon
}

const DEFAULT_STATS: StatItem[] = [
  { value: 1240, label: 'สัญญาที่ออกแล้ว', unit: 'ฉบับ', icon: FileText },
  { value: 68,   label: 'เอเจนต์ที่ใช้งาน', unit: 'คน',   icon: User },
  { value: 530,  label: 'ทรัพย์ในระบบ',    unit: 'รายการ', icon: Home },
  { value: 9,    label: 'ประเภทสัญญา',     unit: 'ประเภท', icon: ClipboardList },
]

function CountUp({ target, active }: { target: number; active: boolean }) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!active) return
    const duration = 1800
    const start = Date.now()
    const frame = setInterval(() => {
      const p = Math.min((Date.now() - start) / duration, 1)
      const eased = 1 - Math.pow(1 - p, 3)
      setCount(Math.round(target * eased))
      if (p >= 1) clearInterval(frame)
    }, 16)
    return () => clearInterval(frame)
  }, [active, target])

  return <>{count.toLocaleString('th-TH')}</>
}

export default function StatsCounter({ stats }: { stats?: StatItem[] }) {
  const [visible, setVisible] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const displayStats = stats ?? DEFAULT_STATS

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry?.isIntersecting) setVisible(true) },
      { threshold: 0.3 }
    )
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [])

  return (
    <div ref={ref} className="bg-blue-600 py-12">
      <div className="max-w-6xl mx-auto px-4">
        <p className="text-center text-blue-200 text-xs font-medium uppercase tracking-widest mb-8">
          ตัวเลขจริงจากระบบ Proppsy
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-center text-white">
          {displayStats.map(s => (
            <div key={s.label}>
              <div className="flex justify-center mb-2"><s.icon className="w-8 h-8 text-blue-200" /></div>
              <p className="text-3xl sm:text-4xl font-bold tabular-nums">
                <CountUp target={s.value} active={visible} />+
              </p>
              <p className="text-xs text-blue-200 mt-0.5">{s.unit}</p>
              <p className="text-sm font-medium mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
