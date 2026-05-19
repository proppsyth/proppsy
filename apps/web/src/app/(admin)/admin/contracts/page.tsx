import type { Metadata } from 'next'
import Link from 'next/link'
import { FileText } from 'lucide-react'
import { createAdminClient } from '@/lib/supabase/server'
import { DOC_TYPE_LABELS } from '@/types'
import type { ContractStatus, ContractCategory } from '@/types'

export const metadata: Metadata = { title: 'ระบบสัญญา — Admin' }

const STATUS_LABELS: Record<ContractStatus, string> = {
  draft: 'ร่าง',
  sent: 'ส่งแล้ว',
  viewed: 'เปิดดูแล้ว',
  partially_signed: 'เซ็นบางส่วน',
  signed: 'เซ็นครบ',
  completed: 'เสร็จสิ้น',
  cancelled: 'ยกเลิก',
  terminated: 'ยกเลิกสัญญา',
  renewed: 'ต่อสัญญาแล้ว',
}

const STATUS_COLORS: Record<ContractStatus, string> = {
  draft: 'bg-gray-100 text-gray-600',
  sent: 'bg-yellow-100 text-yellow-700',
  viewed: 'bg-yellow-100 text-yellow-700',
  partially_signed: 'bg-orange-100 text-orange-700',
  signed: 'bg-green-100 text-green-700',
  completed: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-red-100 text-red-600',
  terminated: 'bg-red-100 text-red-600',
  renewed: 'bg-blue-100 text-blue-700',
}

const CATEGORY_LABELS: Record<ContractCategory, string> = {
  reservation: 'จอง',
  lease: 'เช่า',
  child: 'เอกสารย่อย',
}

const CATEGORY_COLORS: Record<ContractCategory, string> = {
  reservation: 'bg-purple-100 text-purple-700',
  lease: 'bg-blue-100 text-blue-700',
  child: 'bg-gray-100 text-gray-600',
}

export default async function AdminContractsPage() {
  const admin = await createAdminClient()

  const [
    { count: totalCount },
    { count: draftCount },
    { count: inProgressCount },
    { count: completedCount },
    { count: closedCount },
    { count: reservationCount },
    { count: leaseCount },
    { count: childCount },
    { data: contracts },
  ] = await Promise.all([
    admin.from('contracts').select('*', { count: 'exact', head: true }),
    admin.from('contracts').select('*', { count: 'exact', head: true }).eq('status', 'draft'),
    admin.from('contracts').select('*', { count: 'exact', head: true }).in('status', ['sent', 'viewed', 'partially_signed']),
    admin.from('contracts').select('*', { count: 'exact', head: true }).in('status', ['signed', 'completed']),
    admin.from('contracts').select('*', { count: 'exact', head: true }).in('status', ['cancelled', 'terminated', 'renewed']),
    admin.from('contracts').select('*', { count: 'exact', head: true }).eq('contract_category', 'reservation'),
    admin.from('contracts').select('*', { count: 'exact', head: true }).eq('contract_category', 'lease'),
    admin.from('contracts').select('*', { count: 'exact', head: true }).eq('contract_category', 'child'),
    admin
      .from('contracts')
      .select('id, doc_type, status, contract_category, is_finalized, created_at, agent_uid, profiles:agent_uid(nickname, first_name_th, last_name_th, company_name)')
      .order('created_at', { ascending: false })
      .limit(100),
  ])

  return (
    <div className="p-4 lg:p-8 pt-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 bg-indigo-50 rounded-xl flex items-center justify-center flex-shrink-0">
            <FileText className="w-5 h-5 text-indigo-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">ระบบสัญญา</h1>
        </div>
        <p className="text-sm text-gray-400 ml-12">ภาพรวมสัญญาทั้งหมดในระบบ</p>
      </div>

      {/* Stats row 1 — by category */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
        {[
          { label: 'สัญญาทั้งหมด', value: totalCount ?? 0, color: 'text-gray-900' },
          { label: 'ใบจอง', value: reservationCount ?? 0, color: 'text-purple-700' },
          { label: 'สัญญาเช่า', value: leaseCount ?? 0, color: 'text-blue-700' },
          { label: 'เอกสารย่อย', value: childCount ?? 0, color: 'text-gray-600' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-100 p-4">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value.toLocaleString()}</p>
            <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Stats row 2 — by status */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'ร่าง', value: draftCount ?? 0, color: 'text-gray-600' },
          { label: 'กำลังดำเนินการ', value: inProgressCount ?? 0, color: 'text-yellow-700' },
          { label: 'เสร็จสิ้น', value: completedCount ?? 0, color: 'text-green-700' },
          { label: 'ปิดแล้ว', value: closedCount ?? 0, color: 'text-red-600' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-100 p-4">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value.toLocaleString()}</p>
            <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900 text-sm">สัญญาล่าสุด 100 รายการ</h2>
          <span className="text-xs text-gray-400">{contracts?.length ?? 0} รายการ</span>
        </div>
        {!contracts?.length ? (
          <div className="p-12 text-center text-gray-400 text-sm">ยังไม่มีสัญญาในระบบ</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">สัญญา</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide hidden sm:table-cell">เอเจนต์</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide hidden md:table-cell">ประเภท</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">สถานะ</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide hidden lg:table-cell">วันที่</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {contracts.map((c) => {
                  const profile = Array.isArray(c.profiles) ? c.profiles[0] : c.profiles
                  const agentName = profile?.nickname
                    || [profile?.first_name_th, profile?.last_name_th].filter(Boolean).join(' ')
                    || profile?.company_name
                    || c.agent_uid?.slice(0, 8)
                  const status = c.status as ContractStatus
                  const category = c.contract_category as ContractCategory | null

                  return (
                    <tr key={c.id} className="hover:bg-gray-50/50 transition">
                      <td className="px-4 py-3">
                        <Link href={`/contracts/${c.id}`} className="group">
                          <p className="text-xs font-mono text-gray-500 group-hover:text-indigo-600 transition">{c.id}</p>
                          <p className="text-sm text-gray-800 font-medium">
                            {DOC_TYPE_LABELS[c.doc_type as keyof typeof DOC_TYPE_LABELS] ?? c.doc_type}
                            {c.is_finalized && (
                              <span className="ml-1.5 text-[10px] px-1.5 py-0.5 bg-emerald-50 text-emerald-600 rounded font-medium">ยืนยันแล้ว</span>
                            )}
                          </p>
                        </Link>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <p className="text-sm text-gray-700 truncate max-w-[140px]">{agentName ?? '—'}</p>
                        {profile?.company_name && (
                          <p className="text-xs text-gray-400 truncate max-w-[140px]">{profile.company_name}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        {category ? (
                          <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${CATEGORY_COLORS[category]}`}>
                            {CATEGORY_LABELS[category]}
                          </span>
                        ) : (
                          <span className="text-gray-300 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-600'}`}>
                          {STATUS_LABELS[status] ?? status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-gray-400 text-[11px] hidden lg:table-cell">
                        {new Date(c.created_at).toLocaleDateString('th-TH', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
