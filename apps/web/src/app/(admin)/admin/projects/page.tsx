import type { Metadata } from 'next'
import { Building2 } from 'lucide-react'
import { createAdminClient } from '@/lib/supabase/server'
import AdminProjectsList from './AdminProjectsList'

export const metadata: Metadata = { title: 'โครงการ — Admin' }

export default async function AdminProjectsPage() {
  const admin = await createAdminClient()

  const [{ data: projects }, { data: stockRows }] = await Promise.all([
    admin
      .from('projects')
      .select('id, name_th, province, district, bts_mrt, developer, built_year, created_at')
      .order('created_at', { ascending: false }),
    admin
      .from('stock')
      .select('project_id')
      .not('project_id', 'is', null),
  ])

  // Count stock per project in JS
  const stockCountMap = new Map<string, number>()
  for (const row of stockRows ?? []) {
    if (row.project_id) {
      stockCountMap.set(row.project_id, (stockCountMap.get(row.project_id) ?? 0) + 1)
    }
  }

  const projectsWithCount = (projects ?? []).map((p) => ({
    ...p,
    stockCount: stockCountMap.get(p.id) ?? 0,
  }))

  const totalProjects = projectsWithCount.length
  const projectsWithStock = projectsWithCount.filter((p) => p.stockCount > 0).length

  return (
    <div className="p-4 lg:p-8 pt-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 bg-teal-50 rounded-xl flex items-center justify-center flex-shrink-0">
            <Building2 className="w-5 h-5 text-teal-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">โครงการ</h1>
        </div>
        <p className="text-sm text-gray-400 ml-12">ภาพรวมโครงการอสังหาริมทรัพย์ทั้งหมด</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-2xl font-bold text-gray-900">{totalProjects.toLocaleString()}</p>
          <p className="text-xs text-gray-400 mt-0.5">โครงการทั้งหมด</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-2xl font-bold text-teal-700">{projectsWithStock.toLocaleString()}</p>
          <p className="text-xs text-gray-400 mt-0.5">โครงการที่มีสต็อก</p>
        </div>
      </div>

      {/* Client component with search */}
      <AdminProjectsList projects={projectsWithCount} />
    </div>
  )
}
