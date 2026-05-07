import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import type { Appointment } from '@/types'
import AppointmentList from '../appointments/AppointmentList'

export const metadata: Metadata = { title: 'นัดหมาย & ปฏิทิน' }

const WEEKDAYS = ['จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส', 'อา']

function prevMonth(year: number, month: number) {
  if (month === 1) return { year: year - 1, month: 12 }
  return { year, month: month - 1 }
}

function nextMonth(year: number, month: number) {
  if (month === 12) return { year: year + 1, month: 1 }
  return { year, month: month + 1 }
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string; view?: string; tab?: string }>
}) {
  const { year: yearStr, month: monthStr, view = 'calendar', tab = 'upcoming' } = await searchParams
  const now = new Date()
  const year = parseInt(yearStr ?? '') || now.getFullYear()
  const month = parseInt(monthStr ?? '') || now.getMonth() + 1
  const isUpcoming = tab !== 'past'

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const nowIso = now.toISOString()
  const monthStart = new Date(year, month - 1, 1)
  const monthEnd = new Date(year, month, 0)
  const startIso = monthStart.toISOString()
  const endIso = new Date(year, month, 1).toISOString()

  const [
    { data: monthAppointments },
    { data: contracts },
    { data: appointments },
  ] = await Promise.all([
    supabase
      .from('appointments')
      .select('id, title, start_time, end_time')
      .eq('agent_uid', user.id)
      .gte('start_time', startIso)
      .lt('start_time', endIso)
      .order('start_time'),
    supabase
      .from('contracts')
      .select('id, end_date, doc_type, status')
      .eq('agent_uid', user.id)
      .gte('end_date', monthStart.toLocaleDateString('en-CA'))
      .lte('end_date', monthEnd.toLocaleDateString('en-CA'))
      .neq('status', 'cancelled'),
    isUpcoming
      ? supabase
          .from('appointments')
          .select('*, stock:stock(id, unit_no, room_type, project_name), customer:customers(id, prefix, first_name_th, last_name_th, nickname)')
          .eq('agent_uid', user.id)
          .gte('start_time', nowIso)
          .order('start_time')
      : supabase
          .from('appointments')
          .select('*, stock:stock(id, unit_no, room_type, project_name), customer:customers(id, prefix, first_name_th, last_name_th, nickname)')
          .eq('agent_uid', user.id)
          .lt('start_time', nowIso)
          .order('start_time', { ascending: false }),
  ])

  // Build day-keyed maps for calendar
  const aptByDay = new Map<number, typeof monthAppointments>()
  for (const apt of monthAppointments ?? []) {
    const day = new Date(apt.start_time).getDate()
    const list = aptByDay.get(day) ?? []
    list.push(apt)
    aptByDay.set(day, list)
  }

  const contractByDay = new Map<number, typeof contracts>()
  for (const c of contracts ?? []) {
    if (!c.end_date) continue
    const day = new Date(c.end_date + 'T00:00:00').getDate()
    const list = contractByDay.get(day) ?? []
    list.push(c)
    contractByDay.set(day, list)
  }

  const firstWeekday = (monthStart.getDay() + 6) % 7
  const daysInMonth = monthEnd.getDate()
  const totalCells = Math.ceil((firstWeekday + daysInMonth) / 7) * 7

  const prev = prevMonth(year, month)
  const next = nextMonth(year, month)
  const todayDay = now.getFullYear() === year && now.getMonth() + 1 === month ? now.getDate() : -1
  const thMonth = monthStart.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' })

  return (
    <div className="p-4 lg:p-8 pt-6">
      {/* Page-level tab: ปฏิทิน / นัดหมาย */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
          <Link
            href={`/calendar?year=${year}&month=${month}&view=calendar`}
            className={`px-4 py-1.5 text-sm font-medium rounded-lg transition ${
              view !== 'appointments' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            📅 ปฏิทิน
          </Link>
          <Link
            href={`/calendar?view=appointments&tab=upcoming`}
            className={`px-4 py-1.5 text-sm font-medium rounded-lg transition ${
              view === 'appointments' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            🗓️ นัดหมาย
          </Link>
        </div>

        <Link
          href="/appointments/new"
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition"
        >
          <Plus className="w-4 h-4" />
          เพิ่มนัดหมาย
        </Link>
      </div>

      {/* ── Calendar View ── */}
      {view !== 'appointments' && (
        <div className="lg:flex lg:gap-6">
          {/* Calendar grid */}
          <div className="flex-1">
            {/* Month navigation */}
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <Link
                  href={`/calendar?year=${prev.year}&month=${prev.month}&view=calendar`}
                  className="p-2 rounded-lg hover:bg-gray-100 transition text-gray-500"
                >
                  <ChevronLeft className="w-5 h-5" />
                </Link>
                <h2 className="text-lg font-bold text-gray-900 min-w-36 text-center">{thMonth}</h2>
                <Link
                  href={`/calendar?year=${next.year}&month=${next.month}&view=calendar`}
                  className="p-2 rounded-lg hover:bg-gray-100 transition text-gray-500"
                >
                  <ChevronRight className="w-5 h-5" />
                </Link>
              </div>
              <Link
                href={`/calendar?year=${now.getFullYear()}&month=${now.getMonth() + 1}&view=calendar`}
                className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition"
              >
                วันนี้
              </Link>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 mb-3 text-xs text-gray-500">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" />นัดหมาย</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-orange-400 inline-block" />สัญญาหมดอายุ</span>
            </div>

            {/* Grid */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="grid grid-cols-7 border-b border-gray-100">
                {WEEKDAYS.map(d => (
                  <div key={d} className="py-2 text-center text-xs font-semibold text-gray-400">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7">
                {Array.from({ length: totalCells }, (_, i) => {
                  const day = i - firstWeekday + 1
                  const isCurrentMonth = day >= 1 && day <= daysInMonth
                  const isToday = day === todayDay
                  const apts = aptByDay.get(day) ?? []
                  const expirations = contractByDay.get(day) ?? []
                  const weekday = i % 7
                  const hasEvents = apts.length > 0 || expirations.length > 0

                  return (
                    <div
                      key={i}
                      className={`min-h-[52px] sm:min-h-[80px] p-1 sm:p-1.5 border-r border-b border-gray-50 last:border-r-0 ${
                        !isCurrentMonth ? 'bg-gray-50/50' : ''
                      } ${weekday === 6 ? 'bg-red-50/20' : ''}`}
                    >
                      {isCurrentMonth && (
                        <>
                          <div className="flex justify-center mb-1">
                            <span className={`w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center text-[11px] sm:text-xs font-medium rounded-full ${
                              isToday ? 'bg-blue-600 text-white' : 'text-gray-700'
                            }`}>
                              {day}
                            </span>
                          </div>
                          {hasEvents && (
                            <div className="flex justify-center gap-0.5 flex-wrap sm:hidden">
                              {apts.slice(0, 3).map((_, idx) => (
                                <span key={idx} className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                              ))}
                              {expirations.slice(0, 2).map((_, idx) => (
                                <span key={idx} className="w-1.5 h-1.5 rounded-full bg-orange-400 flex-shrink-0" />
                              ))}
                            </div>
                          )}
                          <div className="hidden sm:block space-y-0.5">
                            {apts.slice(0, 2).map(apt => (
                              <Link
                                key={apt.id}
                                href="/calendar?view=appointments"
                                className="block px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-[10px] truncate hover:bg-blue-200 transition"
                                title={apt.title}
                              >
                                {new Date(apt.start_time).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} {apt.title}
                              </Link>
                            ))}
                            {apts.length > 2 && <p className="text-[10px] text-blue-400 px-1">+{apts.length - 2} อื่นๆ</p>}
                            {expirations.slice(0, 2).map(c => (
                              <Link
                                key={c.id}
                                href={`/contracts/${c.id}`}
                                className="block px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded text-[10px] truncate hover:bg-orange-200 transition"
                                title={`${c.id} หมดอายุ`}
                              >
                                📄 {c.id}
                              </Link>
                            ))}
                            {expirations.length > 2 && <p className="text-[10px] text-orange-400 px-1">+{expirations.length - 2}</p>}
                          </div>
                        </>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Mobile: event list for this month */}
            {((monthAppointments?.length ?? 0) > 0 || (contracts?.length ?? 0) > 0) && (
              <div className="mt-4 lg:hidden space-y-3">
                <h2 className="text-sm font-semibold text-gray-700">รายการเดือนนี้</h2>
                {monthAppointments?.map(apt => (
                  <Link key={apt.id} href="/calendar?view=appointments"
                    className="flex items-center gap-3 bg-white rounded-xl border border-gray-100 shadow-sm p-3">
                    <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{apt.title}</p>
                      <p className="text-xs text-gray-400">
                        {new Date(apt.start_time).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}
                        {' · '}
                        {new Date(apt.start_time).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </Link>
                ))}
                {contracts?.filter(c => c.end_date).map(c => (
                  <Link key={c.id} href={`/contracts/${c.id}`}
                    className="flex items-center gap-3 bg-white rounded-xl border border-orange-100 shadow-sm p-3">
                    <span className="w-2 h-2 rounded-full bg-orange-400 flex-shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-orange-800 truncate">สัญญา {c.id} หมดอายุ</p>
                      <p className="text-xs text-orange-500">
                        {new Date(c.end_date! + 'T00:00:00').toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Desktop: upcoming appointments sidebar */}
          <div className="hidden lg:block w-72 shrink-0">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">นัดหมายที่กำลังจะมาถึง</h2>
            <AppointmentList
              appointments={(appointments ?? []) as unknown as Appointment[]}
              tab="upcoming"
            />
          </div>
        </div>
      )}

      {/* ── Appointments View ── */}
      {view === 'appointments' && (
        <div className="max-w-3xl">
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-5 w-fit">
            {(['upcoming', 'past'] as const).map(t => (
              <Link
                key={t}
                href={`/calendar?view=appointments&tab=${t}`}
                className={`px-4 py-1.5 text-sm font-medium rounded-lg transition ${
                  tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
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
      )}
    </div>
  )
}
