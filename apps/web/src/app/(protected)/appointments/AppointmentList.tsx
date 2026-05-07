'use client'

import { useTransition, useState } from 'react'
import Link from 'next/link'
import { Trash2, Loader2, Calendar, Clock, MapPin, User } from 'lucide-react'
import { deleteAppointment } from './actions'
import { stockDisplayTitle, customerDisplayName } from '@/types'
import type { Appointment } from '@/types'

interface Props {
  appointments: Appointment[]
  tab: 'upcoming' | 'past'
}

function fmtDate(d: string) {
  const date = new Date(d)
  return date.toLocaleDateString('th-TH', { weekday: 'short', year: 'numeric', month: 'long', day: 'numeric' })
}

function fmtTime(d: string) {
  return new Date(d).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
}

function groupByDate(appointments: Appointment[]) {
  const groups = new Map<string, Appointment[]>()
  for (const apt of appointments) {
    const key = new Date(apt.start_time).toDateString()
    const list = groups.get(key) ?? []
    list.push(apt)
    groups.set(key, list)
  }
  return groups
}

export default function AppointmentList({ appointments, tab }: Props) {
  const [isPending, startTransition] = useTransition()
  const [deletingId, setDeletingId] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  function handleDelete(id: string) {
    if (!confirm('ลบนัดหมายนี้?')) return
    setDeletingId(id)
    startTransition(async () => {
      const res = await deleteAppointment(id)
      setDeletingId('')
      if (res.error) setErrors(prev => ({ ...prev, [id]: res.error! }))
    })
  }

  if (appointments.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <Calendar className="w-12 h-12 mx-auto mb-3 opacity-25" />
        <p className="text-sm">{tab === 'upcoming' ? 'ไม่มีนัดหมายที่กำลังจะมาถึง' : 'ไม่มีนัดหมายที่ผ่านมา'}</p>
      </div>
    )
  }

  const groups = groupByDate(appointments)

  return (
    <div className="space-y-6">
      {[...groups.entries()].map(([dateKey, apts]) => (
        <div key={dateKey}>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1">
            {fmtDate(apts[0]!.start_time)}
          </p>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm divide-y divide-gray-50">
            {apts.map(apt => (
              <div key={apt.id} className="p-4 flex items-start gap-4">
                {/* Time block */}
                <div className="w-14 text-center flex-shrink-0">
                  <p className="text-sm font-bold text-blue-700">{fmtTime(apt.start_time)}</p>
                  {apt.end_time && (
                    <p className="text-xs text-gray-400">{fmtTime(apt.end_time)}</p>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{apt.title}</p>
                  {apt.description && (
                    <p className="text-xs text-gray-500 mt-0.5">{apt.description}</p>
                  )}
                  <div className="flex flex-wrap gap-3 mt-2">
                    {apt.stock && (
                      <Link href={`/stock/${apt.stock.id}`} className="flex items-center gap-1 text-xs text-blue-600 hover:underline">
                        <MapPin className="w-3 h-3" />
                        {stockDisplayTitle(apt.stock)}
                      </Link>
                    )}
                    {apt.customer && (
                      <Link href={`/customers/${apt.customer.id}`} className="flex items-center gap-1 text-xs text-violet-600 hover:underline">
                        <User className="w-3 h-3" />
                        {customerDisplayName(apt.customer)}
                      </Link>
                    )}
                  </div>
                  {errors[apt.id] && <p className="text-xs text-red-600 mt-1">{errors[apt.id]}</p>}
                </div>

                {/* Delete */}
                <button
                  onClick={() => handleDelete(apt.id)}
                  disabled={isPending && deletingId === apt.id}
                  className="p-1.5 text-gray-300 hover:text-red-500 transition rounded-lg hover:bg-red-50 flex-shrink-0"
                >
                  {isPending && deletingId === apt.id
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <Trash2 className="w-4 h-4" />
                  }
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
