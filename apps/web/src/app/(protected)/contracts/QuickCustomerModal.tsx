'use client'

import { useState, useTransition } from 'react'
import { X, Loader2, UserPlus } from 'lucide-react'
import { createCustomer } from '@/app/(protected)/customers/actions'

interface Props {
  initialQuery?: string
  onCreated: (id: string, label: string) => void
  onClose: () => void
}

const PREFIXES = ['นาย', 'นาง', 'นางสาว']

export default function QuickCustomerModal({ initialQuery = '', onCreated, onClose }: Props) {
  const [prefix, setPrefix]           = useState('')
  const [firstName, setFirstName]     = useState(initialQuery)
  const [lastName, setLastName]       = useState('')
  const [firstNameEn, setFirstNameEn] = useState('')
  const [lastNameEn, setLastNameEn]   = useState('')
  const [phone, setPhone]             = useState('')
  const [lineId, setLineId]           = useState('')
  const [error, setError]             = useState('')
  const [isPending, startTransition]  = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!firstName.trim() && !lastName.trim()) {
      setError('กรุณากรอกชื่อหรือนามสกุล')
      return
    }
    setError('')
    startTransition(async () => {
      const res = await createCustomer({
        prefix:        prefix || undefined,
        first_name_th: firstName.trim() || undefined,
        last_name_th:  lastName.trim() || undefined,
        first_name_en: firstNameEn.trim() || undefined,
        last_name_en:  lastNameEn.trim() || undefined,
        phone:         phone.trim() || undefined,
        line_id:       lineId.trim() || undefined,
        follow_up:     false,
      })
      if (res.error) { setError(res.error); return }
      const label =
        [prefix, firstName.trim(), lastName.trim()].filter(Boolean).join(' ') ||
        res.id!
      onCreated(res.id!, label)
    })
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md shadow-2xl z-10">
        <div className="px-5 pt-5 pb-6">

          {/* Header */}
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-blue-600" />
              <h3 className="text-base font-bold text-gray-900">เพิ่มลูกค้าใหม่</h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-gray-400 mb-5">กรอกข้อมูลเบื้องต้น แก้ไขเพิ่มเติมได้ในหน้าลูกค้า</p>

          <form onSubmit={handleSubmit} className="space-y-3">

            {/* Prefix */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">คำนำหน้า</label>
              <div className="flex gap-2 flex-wrap">
                {PREFIXES.map(p => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPrefix(prefix === p ? '' : p)}
                    className={`px-3 py-1.5 text-sm rounded-lg border transition ${
                      prefix === p
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Thai name */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">
                  ชื่อจริง <span className="text-red-400">*</span>
                </label>
                <input
                  autoFocus
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  placeholder="ชื่อ"
                  className={INPUT_CLS}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">นามสกุล</label>
                <input
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  placeholder="นามสกุล"
                  className={INPUT_CLS}
                />
              </div>
            </div>

            {/* English name */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">First Name (EN)</label>
                <input
                  value={firstNameEn}
                  onChange={e => setFirstNameEn(e.target.value)}
                  placeholder="First name"
                  className={INPUT_CLS}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Last Name (EN)</label>
                <input
                  value={lastNameEn}
                  onChange={e => setLastNameEn(e.target.value)}
                  placeholder="Last name"
                  className={INPUT_CLS}
                />
              </div>
            </div>

            {/* Phone + Line ID */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">เบอร์โทร</label>
                <input
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  type="tel"
                  placeholder="0x-xxxx-xxxx"
                  className={INPUT_CLS}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">LINE ID</label>
                <input
                  value={lineId}
                  onChange={e => setLineId(e.target.value)}
                  placeholder="@lineid"
                  className={INPUT_CLS}
                />
              </div>
            </div>

            {error && <p className="text-xs text-red-500">{error}</p>}

            {/* Actions */}
            <div className="flex gap-2.5 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 border border-gray-200 text-gray-600 text-sm font-medium rounded-xl hover:bg-gray-50 transition"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="flex-[2] flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-xl transition"
              >
                {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {isPending ? 'กำลังบันทึก...' : 'บันทึก & เลือก'}
              </button>
            </div>

          </form>
        </div>
      </div>
    </div>
  )
}

const INPUT_CLS = 'w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition bg-white'
