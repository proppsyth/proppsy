'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Search, Building2 } from 'lucide-react'
import type { Project } from '@/types'

interface Props {
  projects: Project[]
}

export default function ProjectList({ projects }: Props) {
  const [search, setSearch] = useState('')

  const filtered = search.trim()
    ? projects.filter(p => {
        const q = search.toLowerCase()
        return (
          p.name_th.toLowerCase().includes(q) ||
          p.name_en?.toLowerCase().includes(q) ||
          p.developer?.toLowerCase().includes(q) ||
          p.id.toLowerCase().includes(q)
        )
      })
    : projects

  return (
    <div>
      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="ค้นหาชื่อโครงการ, ผู้พัฒนา..."
          className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        />
      </div>

      {/* Empty */}
      {filtered.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <Building2 className="w-6 h-6 text-gray-400" />
          </div>
          <p className="text-gray-500 font-medium mb-1">
            {search ? 'ไม่พบโครงการที่ค้นหา' : 'ยังไม่มีโครงการ'}
          </p>
          <p className="text-gray-400 text-sm">
            {search ? 'ลองค้นหาด้วยคำอื่น' : 'กดปุ่ม "เพิ่มโครงการ" เพื่อเริ่มต้น'}
          </p>
        </div>
      )}

      {/* Grid */}
      {filtered.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {filtered.map(p => <ProjectCard key={p.id} project={p} />)}
        </div>
      )}
    </div>
  )
}

function ProjectCard({ project: p }: { project: Project }) {
  return (
    <Link
      href={`/projects/${p.id}`}
      className="group bg-white rounded-xl border border-gray-100 shadow-sm p-4 hover:shadow-md hover:border-blue-200 transition-all block"
    >
      <div className="flex items-start gap-3 mb-3">
        <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center text-blue-700 flex-shrink-0">
          <Building2 className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-gray-400 mb-0.5">{p.id}</p>
          <p className="font-semibold text-gray-900 text-sm leading-tight">{p.name_th}</p>
          {p.name_en && <p className="text-xs text-gray-400 mt-0.5">{p.name_en}</p>}
        </div>
      </div>

      {p.developer && (
        <p className="text-xs text-gray-500 mb-2">ผู้พัฒนา: {p.developer}</p>
      )}

      <div className="flex flex-wrap gap-1.5">
        {p.built_year && (
          <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
            ปี {p.built_year}
          </span>
        )}
        {p.total_floors && (
          <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
            {p.total_floors} ชั้น
          </span>
        )}
        {p.total_units && (
          <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
            {p.total_units} ยูนิต
          </span>
        )}
      </div>

      {p.bts_mrt?.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {p.bts_mrt.slice(0, 3).map(s => (
            <span key={s} className="text-xs px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full">
              {s}
            </span>
          ))}
          {p.bts_mrt.length > 3 && (
            <span className="text-xs text-gray-400">+{p.bts_mrt.length - 3}</span>
          )}
        </div>
      )}
    </Link>
  )
}
