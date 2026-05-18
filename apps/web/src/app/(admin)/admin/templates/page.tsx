import type { Metadata } from 'next'
import { FileCode, Upload } from 'lucide-react'

export const metadata: Metadata = { title: 'เทมเพลต — Admin' }

export default function AdminTemplatesPage() {
  return (
    <div className="p-4 lg:p-8 pt-6">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 bg-orange-50 rounded-xl flex items-center justify-center flex-shrink-0">
            <FileCode className="w-5 h-5 text-orange-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">Template Management</h1>
        </div>
        <p className="text-sm text-gray-400 ml-12">อัปโหลด DOCX templates จัดการ variable placeholders และ versioning</p>
      </div>

      <div className="grid sm:grid-cols-3 gap-3 mb-8">
        {['Templates ทั้งหมด', 'Active', 'Inactive'].map((label) => (
          <div key={label} className="bg-white rounded-xl border border-gray-100 p-4">
            <p className="text-2xl font-bold text-gray-300">—</p>
            <p className="text-xs text-gray-400 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-100 border-dashed p-12 text-center">
        <div className="w-16 h-16 bg-orange-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Upload className="w-8 h-8 text-orange-400" />
        </div>
        <p className="text-gray-500 font-medium">อัปโหลด DOCX Templates</p>
        <p className="text-gray-400 text-sm mt-1">
          อัปโหลดไฟล์ .docx พร้อม placeholder variables เช่น {'{{tenant_name}}'} {'{{rent_price}}'}
        </p>
        <p className="text-gray-300 text-xs mt-1">ระบบจะ validate placeholders และสร้าง PDF preview อัตโนมัติ</p>
        <span className="inline-flex items-center gap-1 mt-4 px-3 py-1 bg-orange-50 text-orange-600 text-xs font-medium rounded-full">
          Coming Soon
        </span>
      </div>
    </div>
  )
}
