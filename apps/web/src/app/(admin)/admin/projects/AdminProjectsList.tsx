'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Search, MapPin, Train, Building2, Plus } from 'lucide-react'

interface ProjectRow {
  id: string
  name_th: string
  province: string | null
  district: string | null
  bts_mrt: string[] | null
  developer: string | null
  built_year: number | null
  created_at: string
  stockCount: number
}

export default function AdminProjectsList({ projects }: { projects: ProjectRow[] }) {
  const [query, setQuery] = useState('')

  const filtered = query.trim()
    ? projects.filter((p) => {
        const q = query.toLowerCase()
        return (
          p.name_th.toLowerCase().includes(q) ||
          (p.province ?? '').toLowerCase().includes(q) ||
          (p.district ?? '').toLowerCase().includes(q) ||
          (p.developer ?? '').toLowerCase().includes(q)
        )
      })
    : projects

  return (
    <div>
      {/* Search + new button */}
      <div className="flex gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ค้นหาชื่อโครงการ จังหวัด เขต..."
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          />
        </div>
        <Link
          href="/projects/new"
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition flex-shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">สร้างโครงการ</span>
        </Link>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-10 text-center">
          <p className="text-gray-400 text-sm">
            {query ? `ไม่พบโครงการที่ตรงกับ "${query}"` : 'ยังไม่มีโครงการในระบบ'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-50 flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-700">โครงการ</span>
            <span className="text-xs text-gray-400">{filtered.length} โครงการ</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">ชื่อโครงการ</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide hidden sm:table-cell">ที่ตั้ง</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide hidden md:table-cell">BTS/MRT</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">สต็อก</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide hidden lg:table-cell">วันที่สร้าง</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50/50 transition">
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-gray-900">{p.name_th}</p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <p className="text-[10px] font-mono text-gray-400">{p.id}</p>
                        {p.developer && (
                          <p className="text-xs text-gray-400 truncate hidden sm:block max-w-[120px]">· {p.developer}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      {p.province || p.district ? (
                        <div className="flex items-center gap-1 text-xs text-gray-600">
                          <MapPin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                          {[p.district, p.province].filter(Boolean).join(', ')}
                        </div>
                      ) : (
                        <span className="text-gray-300 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      {p.bts_mrt && p.bts_mrt.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {p.bts_mrt.slice(0, 3).map((tag) => (
                            <span key={tag} className="flex items-center gap-0.5 text-[11px] px-2 py-0.5 bg-green-50 text-green-700 rounded-full font-medium">
                              <Train className="w-3 h-3" />
                              {tag}
                            </span>
                          ))}
                          {p.bts_mrt.length > 3 && (
                            <span className="text-[11px] text-gray-400">+{p.bts_mrt.length - 3}</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-300 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`text-sm font-semibold ${p.stockCount > 0 ? 'text-gray-900' : 'text-gray-300'}`}>
                        {p.stockCount}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-400 text-[11px] hidden lg:table-cell">
                      {new Date(p.created_at).toLocaleDateString('th-TH', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
