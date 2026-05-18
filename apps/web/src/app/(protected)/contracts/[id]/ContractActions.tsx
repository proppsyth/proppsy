'use client'

import { useTransition, useState } from 'react'
import {
  Loader2, Send, X, FileDown, ExternalLink, Eye, Lock, CheckCircle2, ClipboardCheck,
} from 'lucide-react'
import type { ContractStatus } from '@/types'
import {
  updateContractStatus, generateContractDocx, generateContractPdf, finalizeManually,
} from '../actions'
import Link from 'next/link'

interface Props {
  contractId: string
  status: ContractStatus
  pdfUrl?: string | null
  docxUrl?: string | null
  finalizedDocxUrl?: string | null
  finalizedPdfUrl?: string | null
  templateSlug?: string | null
  isFinalized?: boolean
  finalizedAt?: string | null
}

export default function ContractActions({
  contractId, status, pdfUrl, docxUrl, finalizedDocxUrl, finalizedPdfUrl,
  templateSlug, isFinalized, finalizedAt,
}: Props) {
  const [isStatusPending, startStatus] = useTransition()
  const [isDocxPending, startDocx] = useTransition()
  const [isPdfPending, startPdf] = useTransition()
  const [isFinalizePending, startFinalize] = useTransition()

  const [statusError, setStatusError] = useState('')
  const [docxError, setDocxError] = useState('')
  const [pdfError, setPdfError] = useState('')
  const [finalizeError, setFinalizeError] = useState('')
  const [showFinalizeConfirm, setShowFinalizeConfirm] = useState(false)

  const [currentDocxUrl, setCurrentDocxUrl] = useState(docxUrl ?? '')
  const [currentPdfUrl, setCurrentPdfUrl] = useState(pdfUrl ?? '')
  const [missingVars, setMissingVars] = useState<string[]>([])

  const hasTemplate = !!templateSlug

  // Finalized contracts show permanent download links — no regeneration allowed
  if (isFinalized) {
    const fmtDate = finalizedAt
      ? new Date(finalizedAt).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
      : null
    return (
      <div className="space-y-3">
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
          <div className="flex items-start gap-2.5 mb-3">
            <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-emerald-800">สัญญาสมบูรณ์ — ล็อกแล้ว</p>
              {fmtDate && <p className="text-xs text-emerald-600 mt-0.5">ลงนามครบเมื่อ {fmtDate}</p>}
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-100/70 rounded-lg px-3 py-2">
            <Lock className="w-3.5 h-3.5 flex-shrink-0" />
            ข้อมูล ลายเซ็น และเอกสารถูกล็อกเป็นเวอร์ชันสุดท้าย
          </div>
        </div>

        {(finalizedDocxUrl || finalizedPdfUrl || docxUrl || pdfUrl) && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50/70">
              <h2 className="text-sm font-semibold text-gray-700">เอกสารสุดท้าย</h2>
            </div>
            <div className="p-4 space-y-2">
              {(finalizedDocxUrl || docxUrl) && (
                <a
                  href={(finalizedDocxUrl || docxUrl)!}
                  download
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition"
                >
                  <FileDown className="w-4 h-4" />
                  ดาวน์โหลด .docx
                </a>
              )}
              {(finalizedPdfUrl || pdfUrl) && (
                <a
                  href={(finalizedPdfUrl || pdfUrl)!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-200 text-gray-700 hover:bg-gray-50 text-sm font-medium rounded-xl transition"
                >
                  <ExternalLink className="w-4 h-4" />
                  เปิด PDF
                </a>
              )}
            </div>
          </div>
        )}

        {hasTemplate && (
          <Link
            href={`/contracts/${contractId}/preview`}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100 text-sm font-medium rounded-xl transition"
          >
            <Eye className="w-4 h-4" />
            Preview เอกสาร
          </Link>
        )}
      </div>
    )
  }

  function changeStatus(newStatus: ContractStatus) {
    setStatusError('')
    startStatus(async () => {
      const res = await updateContractStatus(contractId, newStatus)
      if (res.error) setStatusError(res.error)
    })
  }

  function handleGenerateDocx() {
    setDocxError('')
    setMissingVars([])
    startDocx(async () => {
      const res = await generateContractDocx(contractId)
      if (res.error) {
        setDocxError(res.error)
        if (res.missing) setMissingVars(res.missing)
        return
      }
      if (res.url) {
        setCurrentDocxUrl(res.url)
        window.open(res.url, '_blank')
      }
    })
  }

  function handleGeneratePdf() {
    setPdfError('')
    startPdf(async () => {
      const res = await generateContractPdf(contractId)
      if (res.error) { setPdfError(res.error); return }
      if (res.url) {
        setCurrentPdfUrl(res.url)
        window.open(res.url, '_blank')
      }
    })
  }

  const canSend   = status === 'draft'
  const canCancel = ['draft', 'sent', 'viewed', 'partially_signed'].includes(status)

  return (
    <div className="space-y-3">
      {/* Preview */}
      {hasTemplate && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50/70">
            <h2 className="text-sm font-semibold text-gray-700">ตัวอย่างเอกสาร</h2>
          </div>
          <div className="p-4">
            <Link
              href={`/contracts/${contractId}/preview`}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100 text-sm font-medium rounded-xl transition"
            >
              <Eye className="w-4 h-4" />
              Preview เอกสาร
            </Link>
          </div>
        </div>
      )}

      {/* .docx Download */}
      {hasTemplate && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50/70">
            <h2 className="text-sm font-semibold text-gray-700">ดาวน์โหลด .docx</h2>
          </div>
          <div className="p-4 space-y-2">
            {currentDocxUrl && (
              <a
                href={currentDocxUrl}
                download
                className="flex items-center gap-1.5 text-sm text-blue-600 hover:underline mb-2"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                เปิด .docx ล่าสุด
              </a>
            )}
            <button
              type="button"
              onClick={handleGenerateDocx}
              disabled={isDocxPending}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition disabled:opacity-50"
            >
              {isDocxPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
              {isDocxPending ? 'กำลังสร้าง...' : currentDocxUrl ? 'สร้าง .docx ใหม่' : 'สร้าง .docx'}
            </button>
            {docxError && (
              <div className="text-xs text-red-600">
                {docxError}
                {missingVars.length > 0 && (
                  <ul className="list-disc list-inside mt-1">
                    {missingVars.map(v => <li key={v}>{v}</li>)}
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* PDF (legacy) */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50/70">
          <h2 className="text-sm font-semibold text-gray-700">PDF (legacy)</h2>
        </div>
        <div className="p-4 space-y-2">
          {currentPdfUrl && (
            <a
              href={currentPdfUrl}
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
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-200 text-gray-700 hover:bg-gray-50 text-sm font-medium rounded-xl transition disabled:opacity-50"
          >
            {isPdfPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
            {isPdfPending ? 'กำลังสร้าง...' : 'สร้าง PDF'}
          </button>
          {pdfError && <p className="text-xs text-red-600">{pdfError}</p>}
        </div>
      </div>

      {/* Status Actions */}
      {(canSend || canCancel) && (
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

      {/* Manual Finalization */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50/70">
          <h2 className="text-sm font-semibold text-gray-700">ล็อกสัญญาด้วยตนเอง</h2>
        </div>
        <div className="p-4">
          {showFinalizeConfirm ? (
            <div className="space-y-3">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                <p className="text-xs font-semibold text-amber-800 mb-1">ยืนยันการล็อกสัญญา?</p>
                <p className="text-xs text-amber-700 leading-relaxed">
                  ใช้สำหรับสัญญาที่ลงนามกระดาษหรือออฟไลน์แล้ว เมื่อล็อกแล้วจะไม่สามารถแก้ไขได้อีก
                  เวอร์ชัน .docx และ PDF ปัจจุบันจะถูกบันทึกเป็นเอกสารสุดท้าย
                </p>
              </div>
              {finalizeError && <p className="text-xs text-red-600">{finalizeError}</p>}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setFinalizeError('')
                    startFinalize(async () => {
                      const res = await finalizeManually(contractId)
                      if (res.error) { setFinalizeError(res.error); return }
                      setShowFinalizeConfirm(false)
                    })
                  }}
                  disabled={isFinalizePending}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-xl transition disabled:opacity-50"
                >
                  {isFinalizePending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                  {isFinalizePending ? 'กำลังล็อก...' : 'ยืนยัน'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowFinalizeConfirm(false)}
                  className="flex-1 py-2.5 border border-gray-200 text-gray-600 text-sm rounded-xl hover:bg-gray-50 transition"
                >
                  ยกเลิก
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowFinalizeConfirm(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-emerald-300 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 text-sm font-medium rounded-xl transition"
            >
              <ClipboardCheck className="w-4 h-4" />
              ล็อกสัญญา (ลงนามออฟไลน์แล้ว)
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
