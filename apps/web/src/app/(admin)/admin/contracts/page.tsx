import type { Metadata } from 'next'
import { FileText } from 'lucide-react'
import { DOC_TYPE_LABELS } from '@/types'

export const metadata: Metadata = { title: 'ระบบสัญญา — Admin' }

export default function AdminContractsPage() {
  const docTypes = Object.entries(DOC_TYPE_LABELS)

  return (
    <div className="p-4 lg:p-8 pt-6">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 bg-indigo-50 rounded-xl flex items-center justify-center flex-shrink-0">
            <FileText className="w-5 h-5 text-indigo-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">ระบบสัญญา</h1>
        </div>
        <p className="text-sm text-gray-400 ml-12">จัดการ e-sign rules, legal clauses และ PDF generation settings</p>
      </div>

      {/* Doc types overview */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden mb-6">
        <div className="px-5 py-4 border-b border-gray-50">
          <h2 className="font-semibold text-gray-900 text-sm">ประเภทเอกสารที่รองรับ ({docTypes.length} ประเภท)</h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-0 divide-y sm:divide-y-0 sm:divide-x divide-gray-50">
          {docTypes.map(([key, label]) => (
            <div key={key} className="flex items-center gap-3 px-5 py-3">
              <FileText className="w-4 h-4 text-gray-300 flex-shrink-0" />
              <div>
                <p className="text-sm text-gray-700">{label}</p>
                <p className="text-[10px] text-gray-400 font-mono">{key}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
        <FileText className="w-12 h-12 mx-auto mb-4 text-gray-200" />
        <p className="text-gray-500 font-medium">Contract System Management</p>
        <p className="text-gray-400 text-sm mt-1">
          จัดการ e-sign flow, กฎการเซ็น, legal clauses, PDF settings และ variable placeholders
        </p>
        <span className="inline-flex items-center gap-1 mt-3 px-3 py-1 bg-indigo-50 text-indigo-600 text-xs font-medium rounded-full">
          Coming Soon
        </span>
      </div>
    </div>
  )
}
