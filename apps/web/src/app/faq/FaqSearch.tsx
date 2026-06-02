'use client'

import { useState, useMemo } from 'react'
import { Search, ChevronDown, HelpCircle } from 'lucide-react'

const CATEGORY_LABELS: Record<string, string> = {
  general:  'ทั่วไป',
  contract: 'สัญญาและเอกสาร',
  listing:  'ทรัพย์สิน',
  payment:  'การชำระเงิน',
  account:  'บัญชีและการเข้าสู่ระบบ',
}

const CATEGORY_COLORS: Record<string, { bg: string; text: string; activeBg: string; activeText: string }> = {
  general:  { bg: 'bg-gray-100',   text: 'text-gray-600',   activeBg: 'bg-gray-800',   activeText: 'text-white' },
  contract: { bg: 'bg-indigo-50',  text: 'text-indigo-700', activeBg: 'bg-indigo-600', activeText: 'text-white' },
  listing:  { bg: 'bg-blue-50',    text: 'text-blue-700',   activeBg: 'bg-blue-600',   activeText: 'text-white' },
  payment:  { bg: 'bg-green-50',   text: 'text-green-700',  activeBg: 'bg-green-600',  activeText: 'text-white' },
  account:  { bg: 'bg-orange-50',  text: 'text-orange-700', activeBg: 'bg-orange-600', activeText: 'text-white' },
}

const DEFAULT_COLOR = { bg: 'bg-gray-100', text: 'text-gray-600', activeBg: 'bg-gray-800', activeText: 'text-white' }

export interface FaqItem {
  id: string
  question: string
  answer: string
  category: string
  sort_order: number
}

interface Props {
  items: FaqItem[]
  categories: string[]
}

export default function FaqSearch({ items, categories }: Props) {
  const [query, setQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState<string | null>(null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return items.filter(item => {
      const matchCat = !activeCategory || item.category === activeCategory
      const matchQuery = !q ||
        item.question.toLowerCase().includes(q) ||
        item.answer.toLowerCase().includes(q)
      return matchCat && matchQuery
    })
  }, [items, query, activeCategory])

  // Group filtered results by category
  const grouped = useMemo(() => {
    const map = new Map<string, FaqItem[]>()
    for (const item of filtered) {
      const cat = item.category ?? 'general'
      if (!map.has(cat)) map.set(cat, [])
      map.get(cat)!.push(item)
    }
    return map
  }, [filtered])

  const visibleCategories = categories.filter(c => grouped.has(c))

  return (
    <>
      {/* Search bar */}
      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="ค้นหาคำถาม เช่น ลายเซ็น, สัญญา, ค่าเช่า..."
          className="w-full pl-12 pr-4 py-3.5 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-sm transition"
        />
      </div>

      {/* Category pills */}
      <div className="flex flex-wrap gap-2 mb-8">
        <button
          onClick={() => setActiveCategory(null)}
          className={`px-4 py-1.5 rounded-full text-xs font-semibold transition ${
            !activeCategory ? 'bg-blue-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          ทั้งหมด
          {!query && <span className="ml-1 opacity-70">({items.length})</span>}
        </button>
        {categories.map(cat => {
          const c = CATEGORY_COLORS[cat] ?? DEFAULT_COLOR
          const count = items.filter(i => i.category === cat).length
          const isActive = activeCategory === cat
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(isActive ? null : cat)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition ${
                isActive ? `${c.activeBg} ${c.activeText} shadow-sm` : `${c.bg} ${c.text} hover:opacity-80`
              }`}
            >
              {CATEGORY_LABELS[cat] ?? cat}
              <span className="ml-1 opacity-70">({count})</span>
            </button>
          )
        })}
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <div className="text-center py-20">
          <HelpCircle className="w-12 h-12 mx-auto mb-3 text-gray-200" />
          <p className="text-gray-500 font-medium mb-1">ไม่พบคำถามที่ตรงกัน</p>
          <p className="text-gray-400 text-sm">ลองใช้คำค้นหาอื่น หรือเลือกหมวดหมู่อื่น</p>
          <button
            onClick={() => { setQuery(''); setActiveCategory(null) }}
            className="mt-4 text-sm text-blue-600 hover:underline"
          >
            ล้างตัวกรอง
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {query && (
            <p className="text-xs text-gray-400">พบ {filtered.length} คำถาม</p>
          )}
          {visibleCategories.map(cat => {
            const catItems = grouped.get(cat)!
            const c = CATEGORY_COLORS[cat] ?? DEFAULT_COLOR
            return (
              <div key={cat} id={cat}>
                <div className="flex items-center gap-2 mb-3">
                  <span className={`text-xs font-semibold px-3 py-1 rounded-full ${c.bg} ${c.text}`}>
                    {CATEGORY_LABELS[cat] ?? cat}
                  </span>
                  <span className="text-xs text-gray-400">{catItems.length} คำถาม</span>
                </div>
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden divide-y divide-gray-50">
                  {catItems.map(item => (
                    <details key={item.id} className="group">
                      <summary className="flex items-start justify-between gap-4 px-5 py-4 cursor-pointer list-none select-none hover:bg-gray-50/50 transition">
                        <span className="text-sm font-medium text-gray-800 leading-snug flex-1 pt-0.5">
                          {item.question}
                        </span>
                        <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5 transition-transform duration-200 group-open:rotate-180" />
                      </summary>
                      <div className="px-5 pb-5 pt-1 text-sm text-gray-600 leading-relaxed whitespace-pre-line border-t border-gray-50 bg-gray-50/30">
                        {item.answer}
                      </div>
                    </details>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}
