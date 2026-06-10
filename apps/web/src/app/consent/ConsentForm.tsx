'use client'

import { useState } from 'react'
import { saveConsent } from './actions'

const CHECKBOX_CLS = 'w-4 h-4 mt-0.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 flex-shrink-0'
const LINK_CLS = 'text-blue-600 hover:underline'

export default function ConsentForm({ next }: { next: string }) {
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [agreedToPrivacy, setAgreedToPrivacy] = useState(false)
  const [agreedToDataController, setAgreedToDataController] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!agreedToTerms) { setError('กรุณายอมรับข้อกำหนดการใช้งาน'); return }
    if (!agreedToPrivacy) { setError('กรุณายอมรับนโยบายความเป็นส่วนตัว'); return }
    if (!agreedToDataController) { setError('กรุณายืนยันการยินยอมเกี่ยวกับข้อมูลส่วนบุคคล'); return }

    setLoading(true)
    const result = await saveConsent()
    if (result.error) {
      setError('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง')
      setLoading(false)
      return
    }
    // Hard redirect ensures Next.js fetches fresh server-component data (account_status)
    // rather than serving a cached render that still shows 'pending'.
    window.location.href = next
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <label className="flex items-start gap-3 cursor-pointer">
        <input type="checkbox" checked={agreedToTerms} onChange={e => setAgreedToTerms(e.target.checked)} className={CHECKBOX_CLS} />
        <span className="text-sm text-gray-600 leading-relaxed">
          ฉันยอมรับ{' '}
          <a href="/terms" target="_blank" rel="noopener noreferrer" className={LINK_CLS}>ข้อกำหนดการใช้งาน</a>
        </span>
      </label>

      <label className="flex items-start gap-3 cursor-pointer">
        <input type="checkbox" checked={agreedToPrivacy} onChange={e => setAgreedToPrivacy(e.target.checked)} className={CHECKBOX_CLS} />
        <span className="text-sm text-gray-600 leading-relaxed">
          ฉันยอมรับ{' '}
          <a href="/privacy" target="_blank" rel="noopener noreferrer" className={LINK_CLS}>นโยบายความเป็นส่วนตัว</a>
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
    </form>
  )
}
