import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Bell } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getNotificationPrefs } from '../actions'
import NotificationSettings from './NotificationSettings'

export const metadata: Metadata = { title: 'ตั้งค่าการแจ้งเตือน' }

export default async function NotificationSettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const prefs = await getNotificationPrefs()

  return (
    <div className="max-w-2xl mx-auto px-4 py-5 space-y-4">
      <div className="flex items-center gap-2">
        <Link href="/dashboard" className="text-gray-400 hover:text-gray-600"><ArrowLeft className="w-5 h-5" /></Link>
        <Bell className="w-5 h-5 text-blue-600" />
        <h1 className="text-lg font-semibold text-gray-800">ตั้งค่าการแจ้งเตือน</h1>
      </div>
      <p className="text-xs text-gray-500">เลือกประเภทที่ต้องการรับแจ้งเตือน (กระดิ่ง + push) — ปิดได้ตามต้องการ</p>
      <NotificationSettings initialPrefs={prefs} />
    </div>
  )
}
