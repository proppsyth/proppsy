'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { saveConsent } from './actions'
import { TERMS_SECTIONS } from '@/lib/legal/terms-content'
import { PRIVACY_SECTIONS } from '@/lib/legal/privacy-content'
import type { LegalSection } from '@/lib/legal/terms-content'

const CHECKBOX_CLS = 'w-4 h-4 mt-0.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 flex-shrink-0'

// ─── Legal modal ──────────────────────────────────────────────────────────────

function LegalModal({ title, sections, onClose }: {
  title: string
  sections: LegalSection[]
  onClose: () => void
}) {
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-[900px] max-h-[80vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <h2 className="text-base font-semibold text-gray-900">{title}</h2>
          <button type="button" onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5 space-y-6">
          {sections.map((s) => (
            <div key={s.title}>
              <h3 className="text-sm font-semibold text-gray-800 mb-2">{s.title}</h3>
              <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{s.body}</p>
            </div>
          ))}
        </div>
        <div className="flex-shrink-0 px-6 py-4 border-t border-gray-100 flex justify-end">
          <button type="button" onClick={onClose}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition">
            ปิด
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

// ─── Main form ────────────────────────────────────────────────────────────────

export default function ConsentForm({ next }: { next: string }) {
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [agreedToPrivacy, setAgreedToPrivacy] = useState(false)
  const [agreedToDataController, setAgreedToDataController] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showTerms, setShowTerms] = useState(false)
  const [showPrivacy, setShowPrivacy] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!agreedToTerms) { setError('กรุณายอมรับข้อกำหนดการใช้งาน'); return }
    if (!agreedToPrivacy) { setError('กรุณายอมรับนโยบายความเป็นส่วนตัว'); return }
    if (!agreedToDataController) { setError('กรุณายืนยันการยินยอมเกี่ยวกับข้อมูลส่วนบุคคล'); return }

    setLoading(true)
    try {
      const result = await saveConsent()
      if (result.error) {
        setError('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง')
        setLoading(false)
        return
      }
      // Google users who haven't filled in phone/national_id yet → profile setup first
      if (result.needsProfileSetup) {
        window.location.href = '/profile/setup'
        return
      }
      // Hard redirect ensures Next.js fetches fresh server-component data (account_status)
      // rather than serving a cached render that still shows 'pending'.
      window.location.href = next
    } catch {
      setError('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง')
      setLoading(false)
    }
  }

  return (
    <>
      {showTerms && <LegalModal title="ข้อกำหนดการใช้งาน" sections={TERMS_SECTIONS} onClose={() => setShowTerms(false)} />}
      {showPrivacy && <LegalModal title="นโยบายความเป็นส่วนตัว" sections={PRIVACY_SECTIONS} onClose={() => setShowPrivacy(false)} />}

      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="flex items-start gap-3 cursor-pointer">
          <input type="checkbox" checked={agreedToTerms} onChange={e => setAgreedToTerms(e.target.checked)} className={CHECKBOX_CLS} />
          <span className="text-sm text-gray-600 leading-relaxed">
            ฉันยอมรับ{' '}
            <button
              type="button"
              onClick={() => setShowTerms(true)}
              className="text-blue-600 hover:underline"
            >
              ข้อกำหนดการใช้งาน
            </button>
          </span>
        </label>

        <label className="flex items-start gap-3 cursor-pointer">
          <input type="checkbox" checked={agreedToPrivacy} onChange={e => setAgreedToPrivacy(e.target.checked)} className={CHECKBOX_CLS} />
          <span className="text-sm text-gray-600 leading-relaxed">
            ฉันยอมรับ{' '}
            <button
              type="button"
              onClick={() => setShowPrivacy(true)}
              className="text-blue-600 hover:underline"
            >
              นโยบายความเป็นส่วนตัว
            </button>
          </span>
        </label>

        <label className="flex items-start gap-3 cursor-pointer">
          <input type="checkbox" checked={agreedToDataController} onChange={e => setAgreedToDataController(e.target.checked)} className={CHECKBOX_CLS} />
          <span className="text-sm text-gray-600 leading-relaxed">
            ฉันยืนยันว่าจะอัปโหลดข้อมูลส่วนบุคคลเฉพาะที่ตนมีอำนาจตามกฎหมายในการรวบรวมและประมวลผลเท่านั้น รวมถึงได้รับความยินยอมจากเจ้าของข้อมูลตามที่กฎหมายกำหนดแล้ว
          </span>
        </label>

        {error && (
          <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-600">{error}</div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-medium py-3 rounded-xl text-sm transition"
        >
          {loading ? 'กำลังบันทึก...' : 'ยืนยันและดำเนินการต่อ'}
        </button>

        <p className="text-xs text-gray-400 text-center">
          อ่านฉบับเต็มได้ที่{' '}
          <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">ข้อกำหนด</a>
          {' '}และ{' '}
          <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">นโยบาย</a>
        </p>
      </form>
    </>
  )
}
