import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Plus } from 'lucide-react'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import type { Project } from '@/types'
import ProjectList from './ProjectList'

export const metadata: Metadata = { title: 'โครงการ' }

export default async function ProjectsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: projects } = await supabase
    .from('projects')
    .select('*')
    .order('name_th')

  return (
    <div className="p-4 lg:p-8 pt-6 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">โครงการ</h1>
          <p className="text-sm text-gray-500 mt-0.5">{(projects ?? []).length} โครงการ</p>
        </div>
        <Link
          href="/projects/new"
          className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition"
        >
          <Plus className="w-4 h-4" />
          เพิ่มโครงการ
        </Link>
      </div>
      <ProjectList projects={(projects ?? []) as unknown as Project[]} />
    </div>
  )
}
