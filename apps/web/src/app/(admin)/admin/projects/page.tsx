import type { Metadata } from 'next'
import { MapPin, Lock } from 'lucide-react'
import { createAdminClient } from '@/lib/supabase/server'

export const metadata: Metadata = { title: 'จัดการโครงการ — Admin' }

export default async function AdminProjectsPage() {
  const admin = await createAdminClient()
  const { count } = await admin.from('projects').select('*', { count: 'exact', head: true })

  return (
    <div className="p-4 lg:p-8 pt-6">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 bg-teal-50 rounded-xl flex items-center justify-center flex-shrink-0">
            <MapPin className="w-5 h-5 text-teal-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">จัดการโครงการ</h1>
        </div>
        <p className="text-sm text-gray-400 ml-12">ข้อมูลโครงการ master — แก้ไขได้เฉพาะแอดมิน</p>
      </div>

      {/* Stats */}
      <div className="grid sm:grid-cols-3 gap-3 mb-8">
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-2xl font-bold text-gray-900">{(count ?? 0).toLocaleString()}</p>
          <p className="text-xs text-gray-400 mt-0.5">โครงการทั้งหมด</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-2xl font-bold text-gray-300">—</p>
          <p className="text-xs text-gray-400 mt-0.5">ที่มีทรัพย์ active</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4 bg-amber-50/40 border-amber-100">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-amber-500" />
            <p className="text-xs font-medium text-amber-700">Admin Only</p>
          </div>
          <p className="text-xs text-amber-600 mt-1">ผู้ใช้ทั่วไปเลือกได้แต่แก้ไขไม่ได้</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
        <MapPin className="w-12 h-12 mx-auto mb-4 text-gray-200" />
        <p className="text-gray-500 font-medium">Project Master Data</p>
        <p className="text-gray-400 text-sm mt-1">
          สร้าง แก้ไข merge โครงการซ้ำ จัดการ facilities, BTS/MRT, และ map links
        </p>
        <p className="text-gray-300 text-xs mt-1">Normal users สามารถเลือกโครงการได้แต่ไม่สามารถแก้ไขข้อมูล master ได้</p>
        <span className="inline-flex items-center gap-1 mt-3 px-3 py-1 bg-teal-50 text-teal-600 text-xs font-medium rounded-full">
          Coming Soon
        </span>
      </div>
    </div>
  )
}
