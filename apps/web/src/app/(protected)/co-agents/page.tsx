import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import CoAgentManager from './CoAgentManager'

export const metadata: Metadata = { title: 'Co-Agent' }

export default async function CoAgentsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: coAgents } = await supabase
    .from('co_agents')
    .select('*')
    .eq('agent_uid', user.id)
    .order('created_at', { ascending: false })

  return (
    <div className="p-4 lg:p-8 pt-6">
      <div className="mb-5">
        <h1 className="text-xl font-bold text-gray-900">Co-Agent</h1>
        <p className="text-sm text-gray-500 mt-0.5">{(coAgents ?? []).length} รายการ</p>
      </div>
      <CoAgentManager initialCoAgents={coAgents ?? []} />
    </div>
  )
}
