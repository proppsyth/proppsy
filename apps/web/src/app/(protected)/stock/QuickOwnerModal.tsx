'use client'

import { useState, useTransition } from 'react'
import { X, Loader2, UserPlus } from 'lucide-react'
import { createOwner } from '@/app/(protected)/owners/actions'

interface Props {
  initialQuery?: string
  onCreated: (id: string, label: string) => void
  onClose: () => void
}

export default function QuickOwnerModal({ initialQuery = '', onCreated, onClose }: Props) {
  const [nickname, setNickname] = useState(initialQuery)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!nickname.trim() && !firstName.trim()) {
      setError('กรุณากรอกชื่อเล่นหรือชื่อจริง')
      return
    }
    setError('')
    startTransition(async () => {
      const res = await createOwner({
        nickname: nickname.trim() || undefined,
        first_name_th: firstName.trim() || undefined,
        last_name_th: lastName.trim() || undefined,
        phone: phone.trim() || undefined,
      })
      if (res.error) { setError(res.error); return }
      const label =
        nickname.trim() ||
        [firstName.trim(), lastName.trim()].filter(Boolean).join(' ') ||
        res.id!
      onCreated(res.id!, label)
    })
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md shadow-2xl z-10">
        <div className="px-5 pt-5 pb-6">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-blue-600" />
              <h3 className="text-base font-bold text-gray-900">เพิ่มเจ้าของทรัพย์ใหม่</h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-gray-400 mb-5">กรอกข้อมูลเบื้องต้น แก้ไขเพิ่มเติมได้ในหน้าเจ้าของทรัพย์</p>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                ชื่อเล่น <span className="text-red-400">*</span>
              </label>
              <input
                autoFocus
                value={nickname}
                onChange={e => setNickname(e.target.value)}
                placeholder="ชื่อเล่น / Nickname"
                className={INPUT_CLS}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">ชื่อจริง</label>
                <input
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

            {error && <p className="text-xs text-red-500">{error}</p>}

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
