import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft, Calendar } from 'lucide-react'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import type { Stock, Customer } from '@/types'
import AppointmentForm from '../AppointmentForm'

export const metadata: Metadata = { title: 'เพิ่มนัดหมาย' }

export default async function NewAppointmentPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: stocks }, { data: customers }] = await Promise.all([
    supabase.from('stock').select('id, unit_no, room_type, project_name').eq('agent_uid', user.id).order('id'),
    supabase.from('customers').select('id, prefix, first_name_th, last_name_th, nickname').eq('agent_uid', user.id).order('id'),
  ])

  return (
    <div className="p-4 lg:p-8 pt-6 max-w-2xl">
      <div className="mb-6">
        <Link href="/appointments" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition mb-3 w-fit">
          <ArrowLeft className="w-4 h-4" />
          กลับรายการนัดหมาย
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
            <Calendar className="w-5 h-5 text-blue-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">เพิ่มนัดหมายใหม่</h1>
        </div>
      </div>

      <AppointmentForm
        stocks={(stocks ?? []) as unknown as Stock[]}
        customers={(customers ?? []) as unknown as Customer[]}
      />
    </div>
  )
}
