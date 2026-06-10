import type { Metadata } from 'next'
import { Tags } from 'lucide-react'
import { createAdminClient } from '@/lib/supabase/server'
import AliasManager from './AliasManager'
import { getAllAliases } from '../alias-actions'

export const metadata: Metadata = { title: 'Project Aliases — Admin' }

export default async function ProjectAliasesPage() {
  const admin = await createAdminClient()

  const [aliases, { data: projects }] = await Promise.all([
    getAllAliases(),
    admin.from('projects').select('id, name_th, name_en').order('name_th', { ascending: true }),
  ])

  return (
    <div className="p-4 lg:p-8 pt-6 max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 bg-indigo-50 rounded-xl flex items-center justify-center flex-shrink-0">
            <Tags className="w-5 h-5 text-indigo-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">Project Aliases</h1>
        </div>
        <p className="text-sm text-gray-400 ml-12">จัดการชื่อเรียกอื่นของโครงการ — ใช้ป้องกันการสร้างโครงการซ้ำ</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-2xl font-bold text-gray-900">{aliases.length}</p>
          <p className="text-xs text-gray-400 mt-0.5">Aliases ทั้งหมด</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-2xl font-bold text-indigo-700">
            {new Set(aliases.map(a => a.project_id)).size}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">โครงการที่มี alias</p>
        </div>
      </div>

      {/* Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 text-sm text-blue-800">
        เมื่อเพิ่ม alias แล้ว ระบบจะตรวจสอบชื่อนี้ทุกครั้งที่มีการสร้างโครงการใหม่
        หากชื่อตรงกับ alias ระบบจะแนะนำโครงการที่มีอยู่แทนการสร้างใหม่
      </div>

      <AliasManager
        aliases={aliases}
        projects={(projects ?? []) as { id: string; name_th: string; name_en: string | null }[]}
      />
    </div>
  )
}
