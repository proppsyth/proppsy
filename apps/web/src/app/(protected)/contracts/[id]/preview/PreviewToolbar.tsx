'use client'

import Link from 'next/link'
import { ArrowLeft, Download, FileText, PenLine } from 'lucide-react'

interface Props {
  contractId: string
  docLabel: string
  pdfUrl?: string | null
  docxUrl?: string | null
  signToken?: string | null
}

export default function PreviewToolbar({ contractId, docLabel, pdfUrl, docxUrl, signToken }: Props) {
  return (
    <div className="bg-white border-b border-gray-200 shadow-sm print:hidden">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3 flex-wrap">
        <Link
          href={`/contracts/${contractId}`}
          className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          กลับ
        </Link>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">{docLabel}</p>
          <p className="text-xs text-gray-400">{contractId}</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {pdfUrl && (
            <a
              href={pdfUrl}
              target="_blank"
              rel="noreferrer"
              download
              className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition"
            >
              <Download className="w-3.5 h-3.5" />
              ดาวน์โหลด PDF
            </a>
          )}
          {pdfUrl && (
            <a
              href={pdfUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 text-gray-700 text-xs font-medium rounded-lg hover:bg-gray-50 transition"
            >
              <FileText className="w-3.5 h-3.5" />
              เปิด / พิมพ์
            </a>
          )}
          {docxUrl && (
            <a
              href={docxUrl}
              download
              className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 text-gray-500 text-xs font-medium rounded-lg hover:bg-gray-50 transition"
            >
              <Download className="w-3 h-3" />
              .docx
            </a>
          )}
          {signToken && (
            <Link
              href={`/sign/${signToken}`}
              className="flex items-center gap-1.5 px-3 py-2 border border-green-200 text-green-700 bg-green-50 text-xs font-medium rounded-lg hover:bg-green-100 transition"
            >
              <PenLine className="w-3.5 h-3.5" />
              ลิงก์ลงนาม
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
