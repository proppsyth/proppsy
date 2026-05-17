'use client'

import { useState, useTransition } from 'react'
import { X, Loader2, Building2 } from 'lucide-react'
import { createProject } from '@/app/(protected)/projects/actions'

interface Props {
  initialName?: string
  onCreated: (id: string, name: string) => void
  onClose: () => void
}

export default function QuickProjectModal({ initialName = '', onCreated, onClose }: Props) {
  const [nameTh, setNameTh] = useState(initialName)
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!nameTh.trim()) { setError('กรุณากรอกชื่อโครงการ'); return }
    setError('')
    startTransition(async () => {
      const res = await createProject({ name_th: nameTh.trim(), facilities: [], bts_mrt: [] })
      if (res.error) { setError(res.error); return }
      onCreated(res.id!, nameTh.trim())
    })
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-sm shadow-2xl z-10">
        <div className="px-5 pt-5 pb-6">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-blue-600" />
              <h3 className="text-base font-bold text-gray-900">เพิ่มโครงการใหม่</h3>
            </div>
            <button type="button" onClick={onClose} className="p-1.5 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition">
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-gray-400 mb-5">ระบบ AI จะเติมข้อมูลโครงการให้อัตโนมัติ</p>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                ชื่อโครงการ <span className="text-red-400">*</span>
              </label>
              <input
                autoFocus
                value={nameTh}
                onChange={e => setNameTh(e.target.value)}
                placeholder="เช่น ลุมพินี สวีท"
                className={INPUT_CLS}
              />
            </div>

            {error && <p className="text-xs text-red-500">{error}</p>}

            <div className="flex gap-2.5 pt-1">
              <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-gray-200 text-gray-600 text-sm font-medium rounded-xl hover:bg-gray-50 transition">
                ยกเลิก
              </button>
              <button type="submit" disabled={isPending} className="flex-[2] flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-xl transition">
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
