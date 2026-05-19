import type { Metadata } from 'next'
import { ScrollText } from 'lucide-react'
import { createAdminClient } from '@/lib/supabase/server'
import AdminLogsFilter from './AdminLogsFilter'

export const metadata: Metadata = { title: 'Audit Log — Admin' }

export default async function AdminLogsPage() {
  const admin = await createAdminClient()

  const { data: events } = await admin
    .from('contract_timeline_events')
    .select('id, contract_id, agent_uid, event_type, description, created_at')
    .order('created_at', { ascending: false })
    .limit(200)

  const eventsData = events ?? []

  // Collect unique agent_uids then fetch profiles
  const agentUids = [...new Set(eventsData.map((e) => e.agent_uid).filter(Boolean))]
  const { data: profileRows } = agentUids.length
    ? await admin
        .from('profiles')
        .select('id, nickname, first_name_th, last_name_th')
        .in('id', agentUids)
    : { data: [] }

  const profileMap = Object.fromEntries(
    (profileRows ?? []).map((p) => [
      p.id,
      p.nickname ||
        [p.first_name_th, p.last_name_th].filter(Boolean).join(' ') ||
        p.id.slice(0, 8),
    ])
  )

  // Stats
  const todayStr = new Date().toISOString().slice(0, 10)
  const todayCount = eventsData.filter((e) => e.created_at.slice(0, 10) === todayStr).length
  const uniqueAgents = new Set(eventsData.map((e) => e.agent_uid)).size

  // Enrich events with agent name
  const enrichedEvents = eventsData.map((e) => ({
    ...e,
    agentName: profileMap[e.agent_uid] ?? e.agent_uid?.slice(0, 8) ?? '—',
  }))

  return (
    <div className="p-4 lg:p-8 pt-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 bg-gray-50 rounded-xl flex items-center justify-center flex-shrink-0">
            <ScrollText className="w-5 h-5 text-gray-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">Audit Log</h1>
        </div>
        <p className="text-sm text-gray-400 ml-12">ประวัติ event จากสัญญา — contract_timeline_events</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: 'events ทั้งหมด (200 ล่าสุด)', value: eventsData.length },
          { label: 'วันนี้', value: todayCount },
          { label: 'เอเจนต์ที่เกี่ยวข้อง', value: uniqueAgents },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-100 p-4">
            <p className="text-2xl font-bold text-gray-900">{s.value.toLocaleString()}</p>
            <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Client component with filter chips + table */}
      <AdminLogsFilter events={enrichedEvents} />
    </div>
  )
}
