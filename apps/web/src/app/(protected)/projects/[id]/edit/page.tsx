import { notFound, redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import type { Project } from '@/types'
import ProjectForm from '../../ProjectForm'

export const metadata: Metadata = { title: 'แก้ไขโครงการ' }

export default async function EditProjectPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: project }, { data: profile }, { data: projectRows }] = await Promise.all([
    supabase.from('projects').select('*').eq('id', id).single(),
    supabase.from('profiles').select('role').eq('id', user.id).single(),
    supabase.from('projects').select('bts_mrt').not('bts_mrt', 'is', null),
  ])
  const existingStations = [
    ...new Set(
      (projectRows ?? []).flatMap((r: { bts_mrt?: string[] | null }) => r.bts_mrt ?? []).filter(Boolean)
    ),
  ].sort()

  if (!project) notFound()

  // Only admins can edit project data
  if (profile?.role !== 'admin') redirect(`/projects/${id}`)

  return (
    <div className="p-4 lg:p-8 pt-6 max-w-3xl">
      <h1 className="text-xl font-bold text-gray-900 mb-6">แก้ไขโครงการ</h1>
      <ProjectForm projectId={id} initialData={project as unknown as Project} existingStations={existingStations} />
    </div>
  )
}
