import type { Metadata } from 'next'
import { Receipt, CreditCard, Zap, TrendingUp } from 'lucide-react'
import { createAdminClient } from '@/lib/supabase/server'

export const metadata: Metadata = { title: 'Billing — Admin' }
export const dynamic = 'force-dynamic'

function fmt(n: number) { return new Intl.NumberFormat('th-TH').format(n) }

const TYPE_BADGE: Record<string, string> = {
  credit_topup:      'bg-blue-100 text-blue-700',
  plan_subscription: 'bg-purple-100 text-purple-700',
}
const TYPE_LABEL: Record<string, string> = {
  credit_topup:      'เติมเครดิต',
  plan_subscription: 'สมัครแพ็กเกจ',
}
const STATUS_BADGE: Record<string, string> = {
  successful: 'bg-green-100 text-green-700',
  pending:    'bg-yellow-100 text-yellow-700',
  failed:     'bg-red-100 text-red-600',
}
const STATUS_LABEL: Record<string, string> = {
  successful: 'สำเร็จ',
  pending:    'รอชำระ',
  failed:     'ล้มเหลว',
}

export default async function AdminBillingPage() {
  const admin = await createAdminClient()
  const thisMonth = new Date().toISOString().slice(0, 7)

  const [{ data: payTxRows }, { data: creditTxRows }] = await Promise.all([
    admin
      .from('payment_transactions')
      .select('id, user_id, omise_charge_id, amount_thb, type, plan, billing_period, credits_granted, status, created_at')
      .order('created_at', { ascending: false })
      .limit(100),
    admin
      .from('credit_transactions')
      .select('id, user_id, amount, type, description, created_at')
      .in('type', ['topup', 'grant', 'assign'])
      .order('created_at', { ascending: false })
      .limit(50),
  ])

  const payTx = payTxRows ?? []
  const creditTx = creditTxRows ?? []

  // Fetch profiles
  const allUserIds = [...new Set([...payTx.map(t => t.user_id), ...creditTx.map(t => t.user_id)].filter(Boolean))]
  const { data: profileRows } = allUserIds.length
    ? await admin.from('profiles').select('id, nickname, first_name_th, last_name_th, email').in('id', allUserIds)
    : { data: [] }

  const profileMap = Object.fromEntries(
    (profileRows ?? []).map(p => [
      p.id,
      p.nickname || [p.first_name_th, p.last_name_th].filter(Boolean).join(' ') || p.email || p.id.slice(0, 8),
    ])
  )

  const successfulTx = payTx.filter(t => t.status === 'successful')
  const totalRevenue = successfulTx.reduce((s, t) => s + (t.amount_thb ?? 0), 0)
  const mrr = successfulTx.filter(t => t.created_at.slice(0, 7) === thisMonth).reduce((s, t) => s + (t.amount_thb ?? 0), 0)
  const totalSubscriptions = successfulTx.filter(t => t.type === 'plan_subscription').length
  const totalTopups = successfulTx.filter(t => t.type === 'credit_topup').length
  const uniqueBuyers = new Set(successfulTx.map(t => t.user_id)).size

  return (
    <div className="p-4 lg:p-8 pt-6 max-w-5xl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 bg-green-50 rounded-xl flex items-center justify-center flex-shrink-0">
            <Receipt className="w-5 h-5 text-green-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">Billing</h1>
        </div>
        <p className="text-sm text-gray-400 ml-12">
          ธุรกรรมจาก Omise webhook — payment_transactions + credit_transactions
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'รายได้รวม',      value: `฿${fmt(totalRevenue)}`, icon: <TrendingUp className="w-4 h-4 text-green-500" />, color: 'text-green-700' },
          { label: 'MRR เดือนนี้',   value: `฿${fmt(mrr)}`,          icon: <Receipt className="w-4 h-4 text-purple-500" />,   color: 'text-purple-700' },
          { label: 'Subscriptions',  value: fmt(totalSubscriptions),   icon: <CreditCard className="w-4 h-4 text-blue-500" />,  color: 'text-blue-700' },
          { label: 'เติมเครดิต',     value: fmt(totalTopups),          icon: <Zap className="w-4 h-4 text-orange-500" />,       color: 'text-orange-700' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="flex items-center gap-1.5 mb-1">{s.icon}<span className="text-xs text-gray-400">{s.label}</span></div>
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Payment transactions table */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden mb-5">
        <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900 text-sm flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-gray-400" />
            Omise Charges ({payTx.length} รายการ)
          </h2>
          <span className="text-xs text-gray-400">{uniqueBuyers} ผู้ชำระไม่ซ้ำ</span>
        </div>
        {payTx.length === 0 ? (
          <div className="p-10 text-center text-gray-400 text-sm">ยังไม่มีธุรกรรม — ตั้งค่า Webhook URL ใน Omise dashboard ก่อน</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-50 bg-gray-50/50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400">วันที่</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 hidden sm:table-cell">ผู้ใช้</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-400">ยอด</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 hidden md:table-cell">ประเภท</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 hidden md:table-cell">รายละเอียด</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400">สถานะ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {payTx.map(tx => (
                  <tr key={tx.id} className="hover:bg-gray-50/40 transition">
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                      {new Date(tx.created_at).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })}
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <p className="text-sm text-gray-700 truncate max-w-[130px]">
                        {profileMap[tx.user_id] ?? tx.user_id?.slice(0, 8) ?? '—'}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-semibold text-sm text-gray-900">฿{fmt(tx.amount_thb ?? 0)}</span>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${TYPE_BADGE[tx.type] ?? 'bg-gray-100 text-gray-600'}`}>
                        {TYPE_LABEL[tx.type] ?? tx.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-xs text-gray-500">
                      {tx.type === 'plan_subscription' && tx.plan && (
                        <span>{tx.plan} ({tx.billing_period === 'yearly' ? 'รายปี' : 'รายเดือน'})</span>
                      )}
                      {tx.type === 'credit_topup' && tx.credits_granted != null && (
                        <span>+{fmt(tx.credits_granted)} เครดิต</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[tx.status] ?? 'bg-gray-100 text-gray-600'}`}>
                        {STATUS_LABEL[tx.status] ?? tx.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Credit grant/topup log */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50">
          <h2 className="font-semibold text-gray-900 text-sm flex items-center gap-2">
            <Zap className="w-4 h-4 text-gray-400" />
            Credit Events — grant / topup / admin ({creditTx.length} รายการ)
          </h2>
        </div>
        {creditTx.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">ยังไม่มี</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-50 bg-gray-50/50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400">วันที่</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 hidden sm:table-cell">ผู้ใช้</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-400">เครดิต</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 hidden md:table-cell">ประเภท</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 hidden lg:table-cell">หมายเหตุ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {creditTx.map(tx => (
                  <tr key={tx.id} className="hover:bg-gray-50/40 transition">
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                      {new Date(tx.created_at).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })}
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <p className="text-sm text-gray-700 truncate max-w-[130px]">
                        {profileMap[tx.user_id] ?? tx.user_id?.slice(0, 8) ?? '—'}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`font-semibold text-sm ${(tx.amount ?? 0) >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                        {(tx.amount ?? 0) >= 0 ? '+' : ''}{fmt(tx.amount ?? 0)}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="text-[11px] px-2 py-0.5 rounded-full font-medium bg-gray-100 text-gray-600">{tx.type}</span>
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
