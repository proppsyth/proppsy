'use client'

import { useTransition, useState } from 'react'
import {
  Loader2, FileDown, ExternalLink, Lock, CheckCircle2, ClipboardCheck, Package,
} from 'lucide-react'
import type { ContractStatus } from '@/types'
import {
  generateContractDocx, generateContractPdf, finalizeManually,
  generateLeaseAttachmentsPdf, generateMoveOutAttachmentPdf,
} from '../actions'

interface Props {
  contractId: string
  status: ContractStatus
  contractCategory?: string | null
  docType?: string | null
  pdfUrl?: string | null
  docxUrl?: string | null
  finalizedDocxUrl?: string | null
  finalizedPdfUrl?: string | null
  attachmentPdfUrl?: string | null
  templateSlug?: string | null
  isFinalized?: boolean
  finalizedAt?: string | null
}

export default function ContractActions({
  contractId, contractCategory, docType,
  pdfUrl, docxUrl, finalizedDocxUrl, finalizedPdfUrl, attachmentPdfUrl,
  templateSlug, isFinalized, finalizedAt,
}: Props) {
  const [isDocxPending, startDocx]     = useTransition()
  const [isPdfPending, startPdf]       = useTransition()
  const [isFinalizePending, startFinalize] = useTransition()
  const [isAttPending, startAtt]       = useTransition()

  const [docxError, setDocxError]         = useState('')
  const [pdfError, setPdfError]           = useState('')
  const [finalizeError, setFinalizeError] = useState('')
  const [attError, setAttError]           = useState('')
  const [showFinalizeConfirm, setShowFinalizeConfirm] = useState(false)

  const [currentDocxUrl, setCurrentDocxUrl] = useState(docxUrl ?? '')
  const [currentPdfUrl, setCurrentPdfUrl]   = useState(pdfUrl ?? '')
  const [currentAttUrl, setCurrentAttUrl]   = useState(attachmentPdfUrl ?? '')
  const [missingVars, setMissingVars]       = useState<string[]>([])

  const hasTemplate  = !!templateSlug
  const isRental     = docType === 'rental'
  const isEndingDoc  = ['termination', 'cancellation', 'end_contract'].includes(docType ?? '')

  function handleGenerateMoveOut() {
    setAttError('')
    startAtt(async () => {
      const res = await generateMoveOutAttachmentPdf(contractId)
      if (res.error) { setAttError(res.error); return }
      if (res.url) { setCurrentAttUrl(res.url); window.open(res.url, '_blank') }
    })
  }

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

        {/* Move-out inspection document — ending contracts only */}
        {isEndingDoc && (
          <div className="bg-white rounded-xl border border-amber-100 shadow-sm overflow-hidden">
            <div className="px-4 py-2.5 border-b border-amber-100 bg-amber-50/60">
              <div className="flex items-center gap-2">
                <ClipboardCheck className="w-3.5 h-3.5 text-amber-600" />
                <h2 className="text-sm font-semibold text-amber-800">เอกสารตรวจสภาพ (ขาออก)</h2>
              </div>
            </div>
            <div className="p-4 space-y-2">
              {currentAttUrl && (
                <a href={currentAttUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-sm text-amber-600 hover:underline mb-2">
                  <ExternalLink className="w-3.5 h-3.5" />
                  เปิดเอกสารตรวจขาออกล่าสุด
                </a>
              )}
              <button
                type="button"
                onClick={handleGenerateMoveOut}
                disabled={isAttPending}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-amber-200 text-amber-700 bg-amber-50 hover:bg-amber-100 text-sm font-medium rounded-xl transition disabled:opacity-50"
              >
                {isAttPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ClipboardCheck className="w-4 h-4" />}
                {isAttPending ? 'กำลังสร้าง...' : currentAttUrl ? 'สร้างเอกสารตรวจขาออกใหม่' : 'สร้างเอกสารตรวจขาออก'}
              </button>
              {attError && <p className="text-xs text-red-600">{attError}</p>}
              <p className="text-xs text-gray-400 leading-relaxed">
                เทียบสภาพทรัพย์สิน เข้าอยู่ → ขาออก · กรอกสภาพขาออกในรายการทรัพย์สินก่อนสร้าง
              </p>
            </div>
          </div>
        )}

        {/* Attachment package — separate document, available independently of finalization */}
        {isRental && (
          <div className="bg-white rounded-xl border border-teal-100 shadow-sm overflow-hidden">
            <div className="px-4 py-2.5 border-b border-teal-100 bg-teal-50/60">
              <div className="flex items-center gap-2">
                <Package className="w-3.5 h-3.5 text-teal-600" />
                <h2 className="text-sm font-semibold text-teal-800">เอกสารแนบ (ชุดส่งมอบ)</h2>
              </div>
            </div>
            <div className="p-4 space-y-2">
              {currentAttUrl && (
                <a
                  href={currentAttUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-sm text-teal-600 hover:underline mb-2"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  เปิดเอกสารแนบล่าสุด
                </a>
              )}
              <button
                type="button"
                onClick={handleGenerateAtt}
                disabled={isAttPending}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-teal-200 text-teal-700 bg-teal-50 hover:bg-teal-100 text-sm font-medium rounded-xl transition disabled:opacity-50"
              >
                {isAttPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Package className="w-4 h-4" />}
                {isAttPending ? 'กำลังสร้าง...' : currentAttUrl ? 'สร้างเอกสารแนบใหม่' : 'สร้างเอกสารแนบ'}
              </button>
              {attError && <p className="text-xs text-red-600">{attError}</p>}
              <p className="text-xs text-gray-400 leading-relaxed">
                เอกสารแยกจากสัญญา · บัตรประชาชน · ทรัพย์สินในห้อง · รูปถ่าย · กุญแจ
              </p>
            </div>
          </div>
        )}
      </div>
    )
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

  function handleGenerateAtt() {
    setAttError('')
    startAtt(async () => {
      const res = await generateLeaseAttachmentsPdf(contractId)
      if (res.error) { setAttError(res.error); return }
      if (res.url) {
        setCurrentAttUrl(res.url)
        window.open(res.url, '_blank')
      }
    })
  }

  const isLease   = contractCategory === 'lease'

  return (
    <div className="space-y-3">
      {/* .docx Download (secondary — editing/custom use) */}
      {hasTemplate && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50/70">
            <h2 className="text-sm font-semibold text-gray-700">.docx (สำหรับแก้ไข)</h2>
          </div>
          <div className="p-4 space-y-2">
            {currentDocxUrl && (
              <a
                href={currentDocxUrl}
                download
                className="flex items-center gap-1.5 text-sm text-blue-600 hover:underline mb-2"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                ดาวน์โหลด .docx ล่าสุด
              </a>
            )}
            <button
              type="button"
              onClick={handleGenerateDocx}
              disabled={isDocxPending}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-200 text-gray-700 hover:bg-gray-50 text-sm font-medium rounded-xl transition disabled:opacity-50"
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

      {/* PDF (legal contract document) */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50/70">
          <h2 className="text-sm font-semibold text-gray-700">PDF (เอกสารทางการ)</h2>
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
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition disabled:opacity-50"
          >
            {isPdfPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
            {isPdfPending ? 'กำลังสร้าง...' : currentPdfUrl ? 'สร้าง PDF ใหม่' : 'สร้าง PDF'}
          </button>
          {pdfError && <p className="text-xs text-red-600">{pdfError}</p>}
        </div>
      </div>

      {/* Move-out inspection document — ending contracts only */}
      {isEndingDoc && (
        <div className="bg-white rounded-xl border border-amber-100 shadow-sm overflow-hidden">
          <div className="px-4 py-2.5 border-b border-amber-100 bg-amber-50/60">
            <div className="flex items-center gap-2">
              <ClipboardCheck className="w-3.5 h-3.5 text-amber-600" />
              <h2 className="text-sm font-semibold text-amber-800">เอกสารตรวจสภาพ (ขาออก)</h2>
            </div>
          </div>
          <div className="p-4 space-y-2">
            {currentAttUrl && (
              <a href={currentAttUrl} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-sm text-amber-600 hover:underline mb-2">
                <ExternalLink className="w-3.5 h-3.5" />
                เปิดเอกสารตรวจขาออกล่าสุด
              </a>
            )}
            <button
              type="button"
              onClick={handleGenerateMoveOut}
              disabled={isAttPending}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-amber-200 text-amber-700 bg-amber-50 hover:bg-amber-100 text-sm font-medium rounded-xl transition disabled:opacity-50"
            >
              {isAttPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ClipboardCheck className="w-4 h-4" />}
              {isAttPending ? 'กำลังสร้าง...' : currentAttUrl ? 'สร้างเอกสารตรวจขาออกใหม่' : 'สร้างเอกสารตรวจขาออก'}
            </button>
            {attError && <p className="text-xs text-red-600">{attError}</p>}
            <p className="text-xs text-gray-400 leading-relaxed">
              เทียบสภาพทรัพย์สิน เข้าอยู่ → ขาออก · กรอกสภาพขาออกในรายการทรัพย์สินก่อนสร้าง
            </p>
          </div>
        </div>
      )}

      {/* Lease Attachments — separate handover document, rental contracts only */}
      {isRental && (
        <div className="bg-white rounded-xl border border-teal-100 shadow-sm overflow-hidden">
          <div className="px-4 py-2.5 border-b border-teal-100 bg-teal-50/60">
            <div className="flex items-center gap-2">
              <Package className="w-3.5 h-3.5 text-teal-600" />
              <h2 className="text-sm font-semibold text-teal-800">เอกสารแนบ (ชุดส่งมอบ)</h2>
            </div>
          </div>
          <div className="p-4 space-y-2">
            {currentAttUrl && (
              <a
                href={currentAttUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-sm text-teal-600 hover:underline mb-2"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                เปิดเอกสารแนบล่าสุด
              </a>
            )}
            <button
              type="button"
              onClick={handleGenerateAtt}
              disabled={isAttPending}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium rounded-xl transition disabled:opacity-50"
            >
              {isAttPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Package className="w-4 h-4" />}
              {isAttPending ? 'กำลังสร้าง...' : currentAttUrl ? 'สร้างเอกสารแนบใหม่' : 'สร้างเอกสารแนบ'}
            </button>
            {attError && <p className="text-xs text-red-600">{attError}</p>}
            <p className="text-xs text-gray-400 leading-relaxed">
              เอกสารแยกจากสัญญา · บัตรประชาชน · ทรัพย์สินในห้อง · รูปถ่าย · กุญแจ
            </p>
          </div>
        </div>
      )}

      {/* Manual Finalization */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50/70">
          <h2 className="text-sm font-semibold text-gray-700">
            {isLease ? 'ล็อกและเปิดใช้งาน (ออฟไลน์)' : 'ล็อกสัญญาด้วยตนเอง'}
          </h2>
        </div>
        <div className="p-4">
          {showFinalizeConfirm ? (
            <div className="space-y-3">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                <p className="text-xs font-semibold text-amber-800 mb-1">ยืนยันการล็อกสัญญา?</p>
                <p className="text-xs text-amber-700 leading-relaxed">
                  {isLease
                    ? 'สำหรับสัญญาเช่าที่ลงนามกระดาษแล้ว เมื่อล็อก ทรัพย์จะเปลี่ยนเป็นเช่าแล้ว และสัญญาจะล็อกถาวร'
                    : 'ใช้สำหรับสัญญาที่ลงนามกระดาษหรือออฟไลน์แล้ว เมื่อล็อกแล้วจะไม่สามารถแก้ไขได้อีก'}
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
              {isLease ? 'ล็อกและเปิดใช้งาน (ลงนามออฟไลน์)' : 'ล็อกสัญญา (ลงนามออฟไลน์แล้ว)'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
