'use client'

import { useState, useTransition } from 'react'
import { GitMerge, Check, X, Loader2, ChevronDown, ChevronUp } from 'lucide-react'
import { linkDuplicateAsAlias } from '../alias-actions'
import type { DuplicatePair } from '../alias-actions'

interface Props {
  pairs: DuplicatePair[]
}

function ScoreBadge({ score }: { score: number }) {
  const pct = Math.round(score * 100)
  const cls =
    pct >= 80 ? 'bg-red-100 text-red-700' :
    pct >= 65 ? 'bg-amber-100 text-amber-700' :
                'bg-gray-100 text-gray-600'
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${cls}`}>
      {pct}% คล้าย
    </span>
  )
}

function PairCard({ pair }: { pair: DuplicatePair }) {
  const [expanded, setExpanded] = useState(false)
  const [canonical, setCanonical] = useState<'a' | 'b'>('a')
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  if (done) return null  // hide resolved pairs immediately

  function handleLink() {
    const canonicalId = canonical === 'a' ? pair.project_a_id : pair.project_b_id
    const otherId     = canonical === 'a' ? pair.project_b_id : pair.project_a_id
    startTransition(async () => {
      const result = await linkDuplicateAsAlias(canonicalId, otherId)
      if (result.error) {
        setError(result.error)
      } else {
        setDone(true)
      }
    })
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <ScoreBadge score={pair.similarity_score} />
          <button
            onClick={() => setExpanded(e => !e)}
            className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700"
          >
            <GitMerge className="w-3.5 h-3.5" />
            Link as Alias
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>

        {/* Two projects side by side */}
        <div className="grid grid-cols-2 gap-3">
          {([
            { id: pair.project_a_id, name_th: pair.project_a_name_th, name_en: pair.project_a_name_en },
            { id: pair.project_b_id, name_th: pair.project_b_name_th, name_en: pair.project_b_name_en },
          ] as const).map((p, i) => (
            <div key={p.id} className="min-w-0">
              <p className="text-[10px] text-gray-400 font-mono">{p.id}</p>
              <p className="text-sm font-semibold text-gray-800 truncate">{p.name_th}</p>
              {p.name_en && <p className="text-xs text-gray-500 truncate">{p.name_en}</p>}
            </div>
          ))}
        </div>
      </div>

      {/* Link form (expanded) */}
      {expanded && (
        <div className="border-t border-gray-50 bg-gray-50/60 px-4 py-3">
          <p className="text-xs font-medium text-gray-600 mb-2">โครงการหลัก (canonical):</p>

          {[
            { val: 'a' as const, id: pair.project_a_id, name: pair.project_a_name_th, alias: pair.project_b_name_th },
            { val: 'b' as const, id: pair.project_b_id, name: pair.project_b_name_th, alias: pair.project_a_name_th },
          ].map(opt => (
            <label key={opt.val} className="flex items-start gap-2.5 py-2 cursor-pointer">
              <input
                type="radio"
                name={`canonical-${pair.project_a_id}-${pair.project_b_id}`}
                value={opt.val}
                checked={canonical === opt.val}
                onChange={() => setCanonical(opt.val)}
                className="mt-0.5"
              />
              <div>
                <p className="text-sm font-medium text-gray-800">{opt.name}
                  <span className="ml-1.5 text-[10px] font-mono text-gray-400">{opt.id}</span>
                </p>
                <p className="text-xs text-gray-400">→ เพิ่ม &ldquo;{opt.alias}&rdquo; เป็น alias</p>
              </div>
            </label>
          ))}

          {error && <p className="text-xs text-red-500 mt-1">{error}</p>}

          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={handleLink}
              disabled={isPending}
              className="flex items-center gap-1.5 text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition disabled:opacity-50"
            >
              {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
              ยืนยัน
            </button>
            <button
              onClick={() => setExpanded(false)}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600"
            >
              <X className="w-3 h-3" />
              ยกเลิก
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function DuplicatesList({ pairs }: Props) {
  if (pairs.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col items-center justify-center py-16 text-gray-400">
        <GitMerge className="w-10 h-10 mb-3 text-gray-200" />
        <p className="text-sm font-medium">ไม่พบโครงการที่น่าจะซ้ำ</p>
        <p className="text-xs mt-1 text-gray-300">ลองปรับ threshold ให้ต่ำลงเพื่อดูผลลัพธ์เพิ่มเติม</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {pairs.map(pair => (
        <PairCard
          key={`${pair.project_a_id}-${pair.project_b_id}`}
          pair={pair}
        />
      ))}
    </div>
  )
}
