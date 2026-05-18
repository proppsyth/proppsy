import type { Metadata } from 'next'
import { HelpCircle } from 'lucide-react'

export const metadata: Metadata = { title: 'FAQ & คู่มือ — Admin' }

export default function AdminFaqPage() {
  return (
    <div className="p-4 lg:p-8 pt-6">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 bg-yellow-50 rounded-xl flex items-center justify-center flex-shrink-0">
            <HelpCircle className="w-5 h-5 text-yellow-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">FAQ & คู่มือการใช้งาน</h1>
        </div>
        <p className="text-sm text-gray-400 ml-12">จัดการ FAQ หน้าคู่มือ และ guide pages</p>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
        <HelpCircle className="w-12 h-12 mx-auto mb-4 text-gray-200" />
        <p className="text-gray-500 font-medium">FAQ & Guide Management</p>
        <p className="text-gray-400 text-sm mt-1">
          สร้างและจัดการ FAQ, คู่มือการใช้งาน, YouTube links และ help center content
        </p>
        <span className="inline-flex items-center gap-1 mt-3 px-3 py-1 bg-yellow-50 text-yellow-600 text-xs font-medium rounded-full">
          Coming Soon
        </span>
      </div>
    </div>
  )
}
