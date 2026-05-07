import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Plus, Calendar } from 'lucide-react'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import type { Appointment } from '@/types'
import AppointmentList from './AppointmentList'

export const metadata: Metadata = { title: 'นัดหมาย' }

export default async function AppointmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const { tab = 'upcoming' } = await searchParams
  const isUpcoming = tab !== 'past'

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const now = new Date().toISOString()
  const query = supabase
    .from('appointments')
    .select('*, stock:stock(id, unit_no, room_type, project_name), customer:customers(id, prefix, first_name_th, last_name_th, nickname)')
    .eq('agent_uid', user.id)

  const { data: appointments } = isUpcoming
    ? await query.gte('start_time', now).order('start_time')
    : await query.lt('start_time', now).order('start_time', { ascending: false })

  return (
    <div className="p-4 lg:p-8 pt-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
            <Calendar className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">นัดหมาย</h1>
            <p className="text-xs text-gray-400">{appointments?.length ?? 0} รายการ</p>
          </div>
        </div>
        <Link
          href="/appointments/new"
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition"
        >
          <Plus className="w-4 h-4" />
          เพิ่มนัดหมาย
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6 w-fit">
        {(['upcoming', 'past'] as const).map(t => (
          <Link
            key={t}
            href={`/appointments?tab=${t}`}
            className={`px-4 py-1.5 text-sm font-medium rounded-lg transition ${
              tab === t || (t === 'upcoming' && !tab)
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t === 'upcoming' ? 'กำลังจะมาถึง' : 'ที่ผ่านมา'}
          </Link>
        ))}
      </div>

      <AppointmentList
        appointments={(appointments ?? []) as unknown as Appointment[]}
        tab={isUpcoming ? 'upcoming' : 'past'}
      />
    </div>
  )
}
