import type { Metadata } from 'next'
import { GitMerge } from 'lucide-react'
import { getPotentialDuplicates } from '../alias-actions'
import DuplicatesList from './DuplicatesList'

export const metadata: Metadata = { title: 'โปรเจคซ้ำ — Admin' }

export default async function DuplicatesPage() {
  const pairs = await getPotentialDuplicates(0.5)

  return (
    <div className="p-4 lg:p-8 pt-6 max-w-3xl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 bg-amber-50 rounded-xl flex items-center justify-center flex-shrink-0">
            <GitMerge className="w-5 h-5 text-amber-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">โปรเจคที่อาจซ้ำกัน</h1>
        </div>
        <p className="text-sm text-gray-400 ml-12">
          ตรวจพบด้วย pg_trgm similarity (threshold ≥ 50%) — ไม่รวมคู่ที่ alias ไว้แล้ว
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-2xl font-bold text-amber-700">{pairs.length}</p>
          <p className="text-xs text-gray-400 mt-0.5">คู่ที่น่าสงสัย</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-2xl font-bold text-gray-400">50%</p>
          <p className="text-xs text-gray-400 mt-0.5">Similarity threshold</p>
        </div>
      </div>

      {/* Info */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 text-sm text-amber-800">
        <strong className="font-semibold">ไม่มีการ merge อัตโนมัติ</strong> — หน้านี้เป็นเพียงเครื่องมือตรวจสอบ
        แอดมินสามารถ "Link as Alias" เพื่อเชื่อมโยงโครงการที่ซ้ำกัน
        ข้อมูลเดิมทั้งหมดยังคงอยู่ครบถ้วน
      </div>

      <DuplicatesList pairs={pairs} />
    </div>
  )
}
