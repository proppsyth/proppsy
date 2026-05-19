'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ExternalLink } from 'lucide-react'

type EventType = 'all' | 'finalized_manually' | 'termination' | 'cancellation' | 'renewal' | 'other'

const FILTER_CHIPS: { key: EventType; label: string }[] = [
  { key: 'all', label: 'ทั้งหมด' },
  { key: 'finalized_manually', label: 'ยืนยัน manual' },
  { key: 'termination', label: 'บอกเลิก' },
  { key: 'cancellation', label: 'ยกเลิก' },
  { key: 'renewal', label: 'ต่อสัญญา' },
  { key: 'other', label: 'อื่นๆ' },
]

const EVENT_COLORS: Record<string, string> = {
  finalized_manually: 'bg-green-100 text-green-700',
  termination: 'bg-red-100 text-red-600',
  cancellation: 'bg-red-100 text-red-600',
  renewal: 'bg-blue-100 text-blue-700',
}

function getEventColor(eventType: string): string {
  return EVENT_COLORS[eventType] ?? 'bg-gray-100 text-gray-600'
}

interface LogEvent {
  id: string
  contract_id: string
  agent_uid: string
  event_type: string
  description: string | null
  created_at: string
  agentName: string
}

const KNOWN_TYPES = new Set(['finalized_manually', 'termination', 'cancellation', 'renewal'])

export default function AdminLogsFilter({ events }: { events: LogEvent[] }) {
  const [active, setActive] = useState<EventType>('all')

  const filtered =
    active === 'all'
      ? events
      : active === 'other'
        ? events.filter((e) => !KNOWN_TYPES.has(e.event_type))
        : events.filter((e) => e.event_type === active)

  return (
    <div>
      {/* Filter chips */}
      <div className="flex flex-wrap gap-2 mb-5">
        {FILTER_CHIPS.map((chip) => (
          <button
            key={chip.key}
            onClick={() => setActive(chip.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
              active === chip.key
                ? 'bg-gray-800 text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'
            }`}
          >
            {chip.label}
            {chip.key !== 'all' && chip.key !== 'other' && (
              <span className="ml-1 opacity-60">
                ({events.filter((e) => e.event_type === chip.key).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900 text-sm">รายการ events</h2>
          <span className="text-xs text-gray-400">{filtered.length} รายการ</span>
        </div>
        {filtered.length === 0 ? (
          <div className="p-10 text-center text-gray-400 text-sm">ไม่มี event ในหมวดนี้</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">วันที่/เวลา</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide hidden sm:table-cell">เอเจนต์</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">ประเภท</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide hidden md:table-cell">รายละเอียด</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">สัญญา</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((e) => (
                  <tr key={e.id} className="hover:bg-gray-50/50 transition">
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                      {new Date(e.created_at).toLocaleDateString('th-TH', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <p className="text-sm text-gray-700 truncate max-w-[120px]">{e.agentName}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${getEventColor(e.event_type)}`}>
                        {e.event_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <p className="text-xs text-gray-500 truncate max-w-[220px]">{e.description ?? '—'}</p>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/contracts/${e.contract_id}`}
                        className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:underline font-mono"
                      >
                        {e.contract_id.slice(0, 12)}
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
