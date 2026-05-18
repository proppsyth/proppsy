import type { Metadata } from 'next'
import { BookOpen } from 'lucide-react'

export const metadata: Metadata = { title: 'บทความ — Admin' }

export default function AdminArticlesPage() {
  return (
    <div className="p-4 lg:p-8 pt-6">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
            <BookOpen className="w-5 h-5 text-blue-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">บทความ / Blog</h1>
        </div>
        <p className="text-sm text-gray-400 ml-12">จัดการบทความ บล็อก และเนื้อหา SEO</p>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
        <BookOpen className="w-12 h-12 mx-auto mb-4 text-gray-200" />
        <p className="text-gray-500 font-medium">Article & Blog Management</p>
        <p className="text-gray-400 text-sm mt-1">สร้างบทความ กำหนด SEO fields อัปโหลด thumbnail และ publish/schedule</p>
        <span className="inline-flex items-center gap-1 mt-3 px-3 py-1 bg-blue-50 text-blue-600 text-xs font-medium rounded-full">
          Coming Soon
        </span>
      </div>
    </div>
  )
}
