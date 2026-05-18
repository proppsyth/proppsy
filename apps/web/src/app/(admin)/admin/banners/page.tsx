import type { Metadata } from 'next'
import { Image as ImageIcon } from 'lucide-react'

export const metadata: Metadata = { title: 'แบนเนอร์ — Admin' }

export default function AdminBannersPage() {
  return (
    <div className="p-4 lg:p-8 pt-6">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 bg-pink-50 rounded-xl flex items-center justify-center flex-shrink-0">
            <ImageIcon className="w-5 h-5 text-pink-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">แบนเนอร์</h1>
        </div>
        <p className="text-sm text-gray-400 ml-12">จัดการแบนเนอร์ homepage sections และ promotional content</p>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
        <ImageIcon className="w-12 h-12 mx-auto mb-4 text-gray-200" />
        <p className="text-gray-500 font-medium">Banner Management</p>
        <p className="text-gray-400 text-sm mt-1">อัปโหลดแบนเนอร์ กำหนด position ตั้งเวลา schedule และ link URL</p>
        <span className="inline-flex items-center gap-1 mt-3 px-3 py-1 bg-pink-50 text-pink-600 text-xs font-medium rounded-full">
          Coming Soon
        </span>
      </div>
    </div>
  )
}
