'use client'

import { useTransition, useState } from 'react'
import { Loader2, Send, PenLine, X, FileDown, ExternalLink } from 'lucide-react'
import type { ContractStatus } from '@/types'
import { updateContractStatus, generateContractPdf } from '../actions'

interface Props {
  contractId: string
  status: ContractStatus
  pdfUrl?: string | null
}

export default function ContractActions({ contractId, status, pdfUrl }: Props) {
  const [isStatusPending, startStatus] = useTransition()
  const [isPdfPending, startPdf] = useTransition()
  const [statusError, setStatusError] = useState('')
  const [pdfError, setPdfError] = useState('')
  const [generatedUrl, setGeneratedUrl] = useState(pdfUrl ?? '')

  function changeStatus(newStatus: ContractStatus) {
    setStatusError('')
    startStatus(async () => {
      const res = await updateContractStatus(contractId, newStatus)
      if (res.error) setStatusError(res.error)
    })
  }

  function handleGeneratePdf() {
    setPdfError('')
    startPdf(async () => {
      const res = await generateContractPdf(contractId)
      if (res.error) { setPdfError(res.error); return }
      if (res.url) {
        setGeneratedUrl(res.url)
        window.open(res.url, '_blank')
      }
    })
  }

  const canSend = status === 'draft'
  const canSign = status === 'sent'
  const canCancel = status === 'draft' || status === 'sent'

  return (
    <div className="space-y-3">
      {/* PDF Section */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50/70">
          <h2 className="text-sm font-semibold text-gray-700">เอกสาร PDF</h2>
        </div>
        <div className="p-4 space-y-2">
          {generatedUrl && (
            <a
              href={generatedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-sm text-blue-600 hover:underline mb-2"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              เปิด PDF ล่าสุด
            </a>
          )}
          <button
            type="button"
            onClick={handleGeneratePdf}
            disabled={isPdfPending}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition disabled:opacity-50"
          >
            {isPdfPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
            {isPdfPending ? 'กำลังสร้าง PDF...' : generatedUrl ? 'สร้าง PDF ใหม่' : 'สร้าง PDF'}
          </button>
          {pdfError && <p className="text-xs text-red-600">{pdfError}</p>}
        </div>
      </div>

      {/* Status Actions */}
      {(canSend || canSign || canCancel) && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50/70">
            <h2 className="text-sm font-semibold text-gray-700">เปลี่ยนสถานะ</h2>
          </div>
          <div className="p-4 space-y-2">
            {canSend && (
              <button
                type="button"
                onClick={() => changeStatus('sent')}
                disabled={isStatusPending}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white text-sm font-medium rounded-xl transition disabled:opacity-50"
              >
                {isStatusPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                ส่งให้ลูกค้าแล้ว
              </button>
            )}
            {canSign && (
              <button
                type="button"
                onClick={() => changeStatus('signed')}
                disabled={isStatusPending}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-xl transition disabled:opacity-50"
              >
                {isStatusPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <PenLine className="w-4 h-4" />}
                ลงนามแล้ว
              </button>
            )}
            {canCancel && (
              <button
                type="button"
                onClick={() => changeStatus('cancelled')}
                disabled={isStatusPending}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-red-200 text-red-600 hover:bg-red-50 text-sm font-medium rounded-xl transition disabled:opacity-50"
              >
                {isStatusPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                ยกเลิกสัญญา
              </button>
            )}
            {statusError && <p className="text-xs text-red-600">{statusError}</p>}
          </div>
        </div>
      )}
    </div>
  )
}
