import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, CheckCircle2, XCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { listLineHistory } from '../actions'

export const metadata: Metadata = { title: 'ประวัติการส่ง LINE' }

const KIND_LABEL: Record<string, string> = {
  rent_reminder:   'แจ้งค่าเช่า',
  expiry_reminder: 'แจ้งหมดสัญญา',
  test:            'ทดสอบ',
}

export default async function LineHistoryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const rows = await listLineHistory(150)

  return (
    <div className="max-w-3xl mx-auto px-4 py-5 space-y-4">
      <div className="flex items-center gap-2">
        <Link href="/line" className="text-gray-400 hover:text-gray-600"><ArrowLeft className="w-5 h-5" /></Link>
        <h1 className="text-lg font-semibold text-gray-800">ประวัติการส่ง LINE</h1>
      </div>

      {rows.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 text-sm text-gray-400 text-center">
          ยังไม่มีประวัติการส่ง
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm divide-y divide-gray-100">
          {rows.map(r => (
            <div key={r.id} className="px-4 py-3 flex items-start gap-3">
              <div className="mt-0.5">
                {r.status === 'sent'
                  ? <CheckCircle2 className="w-4 h-4 text-green-600" />
                  : <XCircle className="w-4 h-4 text-red-500" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-gray-800">{KIND_LABEL[r.kind] ?? r.kind}</span>
                  {r.contractId && <span className="text-xs text-gray-400">{r.contractId}</span>}
                </div>
                {r.projectUnit && <p className="text-xs text-gray-500 truncate">{r.projectUnit}</p>}
                {r.status !== 'sent' && r.error && (
                  <p className="text-xs text-red-500 break-all">{r.error}</p>
                )}
              </div>
              <span className="text-xs text-gray-400 flex-shrink-0">
                {new Date(r.createdAt).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' })}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
