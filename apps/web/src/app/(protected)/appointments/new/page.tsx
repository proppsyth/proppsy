import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft, Calendar } from 'lucide-react'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import AppointmentForm from '../AppointmentForm'

export const metadata: Metadata = { title: 'เพิ่มนัดหมาย' }

export default async function NewAppointmentPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

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

      <AppointmentForm />
    </div>
  )
}
