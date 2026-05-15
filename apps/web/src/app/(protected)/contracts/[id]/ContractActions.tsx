'use client'

import { useTransition, useState } from 'react'
import {
  Loader2, Send, PenLine, X, FileDown, ExternalLink, Eye, Link2, Check,
} from 'lucide-react'
import type { ContractStatus } from '@/types'
import {
  updateContractStatus, generateContractDocx, generateContractPdf,
  generateSignToken,
} from '../actions'
import Link from 'next/link'

interface Props {
  contractId: string
  status: ContractStatus
  pdfUrl?: string | null
  docxUrl?: string | null
  templateSlug?: string | null
  signToken?: string | null
}

export default function ContractActions({
  contractId, status, pdfUrl, docxUrl, templateSlug, signToken,
}: Props) {
  const [isStatusPending, startStatus] = useTransition()
  const [isDocxPending, startDocx] = useTransition()
  const [isPdfPending, startPdf] = useTransition()
  const [isSignPending, startSign] = useTransition()

  const [statusError, setStatusError] = useState('')
  const [docxError, setDocxError] = useState('')
  const [pdfError, setPdfError] = useState('')
  const [signError, setSignError] = useState('')

  const [currentDocxUrl, setCurrentDocxUrl] = useState(docxUrl ?? '')
  const [currentPdfUrl, setCurrentPdfUrl] = useState(pdfUrl ?? '')
  const [missingVars, setMissingVars] = useState<string[]>([])
  const [signLink, setSignLink] = useState(signToken ? `${window?.location?.origin ?? ''}/sign/${signToken}` : '')
  const [linkCopied, setLinkCopied] = useState(false)

  const hasTemplate = !!templateSlug

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

  function handleGenerateSignLink() {
    setSignError('')
    startSign(async () => {
      const res = await generateSignToken(contractId)
      if (res.error) { setSignError(res.error); return }
      if (res.link) setSignLink(res.link)
    })
  }

  function copySignLink() {
    if (!signLink) return
    navigator.clipboard.writeText(signLink)
    setLinkCopied(true)
    setTimeout(() => setLinkCopied(false), 2000)
  }

  const canSend   = status === 'draft'
  const canSign   = status === 'sent'
  const canCancel = status === 'draft' || status === 'sent'

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

      {/* .docx Download (template-based) */}
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

      {/* PDF (legacy React-PDF) */}
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

      {/* E-sign link */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50/70">
          <h2 className="text-sm font-semibold text-gray-700">ลิงก์ลงนาม (E-Sign)</h2>
        </div>
        <div className="p-4 space-y-2">
          {signLink ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={signLink}
                  readOnly
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-xs text-gray-600 bg-gray-50"
                />
                <button
                  type="button"
                  onClick={copySignLink}
                  className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg transition ${
                    linkCopied
                      ? 'bg-green-100 text-green-700'
                      : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {linkCopied ? <Check className="w-3.5 h-3.5" /> : <Link2 className="w-3.5 h-3.5" />}
                  {linkCopied ? 'คัดลอกแล้ว' : 'คัดลอก'}
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleGenerateSignLink}
              disabled={isSignPending}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-200 text-gray-700 hover:bg-gray-50 text-sm font-medium rounded-xl transition disabled:opacity-50"
            >
              {isSignPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
              {isSignPending ? 'กำลังสร้างลิงก์...' : 'สร้างลิงก์ลงนาม'}
            </button>
          )}
          {signError && <p className="text-xs text-red-600">{signError}</p>}
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
