import type { Metadata } from 'next'
import { Receipt } from 'lucide-react'
import { createAdminClient } from '@/lib/supabase/server'

export const metadata: Metadata = { title: 'Billing — Admin' }

export default async function AdminBillingPage() {
  const admin = await createAdminClient()

  const { data: txRows } = await admin
    .from('credit_transactions')
    .select('id, user_id, amount, type, description, created_at')
    .in('type', ['purchase', 'assign'])
    .order('created_at', { ascending: false })
    .limit(100)

  const transactions = txRows ?? []

  // Fetch profiles for user names
  const userIds = [...new Set(transactions.map((t) => t.user_id).filter(Boolean))]
  const { data: profileRows } = userIds.length
    ? await admin
        .from('profiles')
        .select('id, nickname, first_name_th, last_name_th, email')
        .in('id', userIds)
    : { data: [] }

  const profileMap = Object.fromEntries(
    (profileRows ?? []).map((p) => [
      p.id,
      { name: p.nickname || [p.first_name_th, p.last_name_th].filter(Boolean).join(' ') || p.email || p.id.slice(0, 8) },
    ])
  )

  // Stats
  const thisMonth = new Date().toISOString().slice(0, 7)
  const purchases = transactions.filter((t) => t.type === 'purchase')
  const assigns = transactions.filter((t) => t.type === 'assign')
  const thisMonthPurchases = purchases.filter((t) => t.created_at.slice(0, 7) === thisMonth)
  const totalPurchasedCredits = purchases.reduce((sum, t) => sum + (t.amount ?? 0), 0)
  const totalAssignedCredits = assigns.reduce((sum, t) => sum + Math.abs(t.amount ?? 0), 0)
  const uniqueBuyers = new Set(purchases.map((t) => t.user_id)).size

  return (
    <div className="p-4 lg:p-8 pt-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 bg-green-50 rounded-xl flex items-center justify-center flex-shrink-0">
            <Receipt className="w-5 h-5 text-green-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">Billing</h1>
        </div>
        <p className="text-sm text-gray-400 ml-12">
          ประวัติการซื้อเครดิต — proxy ผ่าน credit_transactions (ข้อมูล Omise อยู่ใน Omise dashboard)
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'เครดิตซื้อรวม', value: totalPurchasedCredits.toLocaleString(), color: 'text-green-700' },
          { label: 'เครดิต admin ปรับ', value: totalAssignedCredits.toLocaleString(), color: 'text-blue-700' },
          { label: 'เดือนนี้', value: thisMonthPurchases.length.toLocaleString(), color: 'text-gray-900' },
          { label: 'ผู้ซื้อไม่ซ้ำ', value: uniqueBuyers.toLocaleString(), color: 'text-gray-900' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-100 p-4">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900 text-sm">ธุรกรรมล่าสุด 100 รายการ</h2>
          <span className="text-xs text-gray-400">{transactions.length} รายการ</span>
        </div>
        {transactions.length === 0 ? (
          <div className="p-10 text-center text-gray-400 text-sm">ยังไม่มีธุรกรรมในระบบ</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">วันที่</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide hidden sm:table-cell">ผู้ใช้</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">จำนวน</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide hidden md:table-cell">ประเภท</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide hidden lg:table-cell">หมายเหตุ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-gray-50/50 transition">
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                      {new Date(tx.created_at).toLocaleDateString('th-TH', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <p className="text-sm text-gray-700 truncate max-w-[140px]">
                        {profileMap[tx.user_id]?.name ?? tx.user_id?.slice(0, 8) ?? '—'}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`font-semibold text-sm ${(tx.amount ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {(tx.amount ?? 0) >= 0 ? '+' : ''}{(tx.amount ?? 0).toLocaleString()}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      {tx.type === 'purchase' ? (
                        <span className="text-[11px] px-2 py-0.5 rounded-full font-medium bg-green-100 text-green-700">
                          ซื้อเครดิต
                        </span>
                      ) : (
                        <span className="text-[11px] px-2 py-0.5 rounded-full font-medium bg-blue-100 text-blue-700">
                          แอดมินปรับ
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <p className="text-xs text-gray-400 truncate max-w-[200px]">{tx.description ?? '—'}</p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
