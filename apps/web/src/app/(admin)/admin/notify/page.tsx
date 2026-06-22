import type { Metadata } from 'next'
import NotifyAdminClient from './NotifyAdminClient'

export const metadata: Metadata = { title: 'ประชาสัมพันธ์ & เครื่องมือแจ้งเตือน' }

export default function AdminNotifyPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">ประชาสัมพันธ์ &amp; แจ้งเตือน</h1>
        <p className="text-sm text-gray-500 mt-0.5">ส่งข้อความถึงกระดิ่งของผู้ใช้ทุกคน และทดสอบ cron</p>
      </div>
      <NotifyAdminClient />
    </div>
  )
}
