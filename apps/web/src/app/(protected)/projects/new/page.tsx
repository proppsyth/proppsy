import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import ProjectForm from '../ProjectForm'

export const metadata: Metadata = { title: 'เพิ่มโครงการ' }

export default async function NewProjectPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch all unique BTS/MRT station names from DB for combobox suggestions
  const { data: projectRows } = await supabase
    .from('projects')
    .select('bts_mrt')
    .not('bts_mrt', 'is', null)
  const existingStations = [
    ...new Set(
      (projectRows ?? []).flatMap((r: { bts_mrt?: string[] | null }) => r.bts_mrt ?? []).filter(Boolean)
    ),
  ].sort()

  return (
    <div className="p-4 lg:p-8 pt-6 max-w-3xl">
      <h1 className="text-xl font-bold text-gray-900 mb-6">เพิ่มโครงการใหม่</h1>
      <ProjectForm existingStations={existingStations} />
    </div>
  )
}
