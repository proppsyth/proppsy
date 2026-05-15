import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft, CreditCard, Receipt, Zap } from 'lucide-react'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { getSavedCards } from './actions'
import PaymentMethods from './PaymentMethods'

export const metadata: Metadata = { title: 'การชำระเงิน' }

const PLAN_LABELS: Record<string, string> = {
  starter:      'Starter (ฟรี)',
  standard:     'Proppsy Standard',
  professional: 'Proppsy Standard',
  ai_pro:       'Proppsy AI Pro',
  business:     'Proppsy Business',
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })
}

export default async function BillingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('plan, plan_expires_at, omise_customer_id')
    .eq('id', user.id)
    .single()

  const { cards } = await getSavedCards()

  const plan     = profile?.plan ?? 'starter'
  const planLabel = PLAN_LABELS[plan] ?? plan
  const expiresAt = profile?.plan_expires_at

  return (
    <div className="w-full p-4 lg:p-8 pt-6 max-w-2xl overflow-x-hidden">
      <div className="mb-6">
        <Link href="/profile" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition mb-3 w-fit">
          <ArrowLeft className="w-4 h-4" />
          กลับตั้งค่า
        </Link>
        <h1 className="text-xl font-bold text-gray-900">การชำระเงิน</h1>
        <p className="text-sm text-gray-500 mt-1">จัดการบัตรและแพ็กเกจของคุณ</p>
      </div>

      <div className="space-y-5">
        {/* Current plan summary */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50/70">
            <h2 className="text-sm font-semibold text-gray-700">แพ็กเกจปัจจุบัน</h2>
          </div>
          <div className="p-5 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <Zap className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">{planLabel}</p>
                {expiresAt && (
                  <p className="text-xs text-gray-400 mt-0.5">หมดอายุ {fmtDate(expiresAt)}</p>
                )}
                {!expiresAt && plan === 'starter' && (
                  <p className="text-xs text-gray-400 mt-0.5">ใช้งานฟรี</p>
                )}
              </div>
            </div>
            <Link
              href="/checkout?plan=standard&billing=monthly"
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition"
            >
              <Receipt className="w-3.5 h-3.5" />
              อัปเกรด
            </Link>
          </div>
        </div>

        {/* Payment methods */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50/70 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-gray-500" />
            <h2 className="text-sm font-semibold text-gray-700">บัตรที่บันทึกไว้</h2>
          </div>
          <div className="p-4">
            <PaymentMethods initialCards={cards ?? []} />
          </div>
        </div>
      </div>
    </div>
  )
}
