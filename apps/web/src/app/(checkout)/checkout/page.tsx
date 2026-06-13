import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { getSavedCards } from '@/app/(protected)/billing/actions'
import { getAllPlanLimits } from '@/lib/planLimits'
import CheckoutForm from './CheckoutForm'

export const metadata: Metadata = { title: 'ชำระเงิน — Proppsy' }

// Normalize any legacy/alias slugs to canonical DB plan names
function canonicalPlan(raw?: string): 'professional' | 'business' {
  if (raw === 'business') return 'business'
  return 'professional' // standard, ai_pro, professional all → professional
}

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string; billing?: string }>
}) {
  const params = await searchParams
  const planKey = canonicalPlan(params.plan)
  const billing: 'monthly' | 'yearly' =
    params.billing === 'yearly' ? 'yearly' : 'monthly'

  const allLimits = await getAllPlanLimits()
  const row = allLimits[planKey]

  const monthlyPrice = row?.price_monthly_thb ?? (planKey === 'business' ? 1990 : 990)
  const yearlyPrice  = row?.price_yearly_thb  ?? (planKey === 'business' ? 19900 : 9900)
  const planName     = planKey === 'business' ? 'Business' : 'Professional'
  const amount       = billing === 'yearly' ? yearlyPrice : monthlyPrice

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const savedCards = user ? ((await getSavedCards()).cards ?? []) : []

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <Link href="/services" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition">
          <ArrowLeft className="w-4 h-4" />
          กลับ
        </Link>
        <span className="text-sm font-semibold text-gray-900">ชำระเงิน · Proppsy</span>
      </header>

      {/* Body */}
      <div className="flex-1 flex items-start justify-center p-4 pt-8">
        <div className="w-full max-w-md">
          <h1 className="text-xl font-bold text-gray-900 mb-4">สั่งซื้อแพ็กเกจ</h1>

          {/* Plan switcher */}
          <div className="flex gap-2 mb-4">
            {(['professional', 'business'] as const).map(p => {
              const label = p === 'professional' ? 'Professional' : 'Business'
              const price = p === 'professional'
                ? (allLimits.professional?.price_monthly_thb ?? 990)
                : (allLimits.business?.price_monthly_thb ?? 1990)
              return (
                <Link
                  key={p}
                  href={`/checkout?plan=${p}&billing=${billing}`}
                  className={`flex-1 py-2.5 text-center text-sm rounded-xl border transition font-medium ${
                    planKey === p
                      ? 'bg-gray-900 text-white border-gray-900'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                  }`}
                >
                  {label}
                  <span className="block text-xs font-normal opacity-75">฿{price.toLocaleString('th-TH')}/เดือน</span>
                </Link>
              )
            })}
          </div>

          {/* Billing toggle */}
          <div className="flex gap-2 mb-5">
            <Link
              href={`/checkout?plan=${planKey}&billing=monthly`}
              className={`flex-1 py-2 text-center text-sm rounded-xl border transition font-medium ${
                billing === 'monthly'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
              }`}
            >
              รายเดือน ฿{monthlyPrice.toLocaleString('th-TH')}
            </Link>
            <Link
              href={`/checkout?plan=${planKey}&billing=yearly`}
              className={`flex-1 py-2 text-center text-sm rounded-xl border transition font-medium relative ${
                billing === 'yearly'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
              }`}
            >
              รายปี ฿{yearlyPrice.toLocaleString('th-TH')}
              <span className={`absolute -top-2 -right-1 text-xs px-1.5 py-0.5 rounded-full font-semibold ${billing === 'yearly' ? 'bg-white text-blue-600' : 'bg-green-500 text-white'}`}>
                ประหยัด
              </span>
            </Link>
          </div>

          <CheckoutForm
            plan={planKey}
            billing={billing}
            amount={amount}
            planName={planName}
            savedCards={savedCards}
          />
        </div>
      </div>

      <footer className="text-center text-xs text-gray-400 py-4">
        © {new Date().getFullYear()} Proppsy · มีปัญหา?{' '}
        <Link href="/contact" className="text-blue-500 hover:underline">ติดต่อเรา</Link>
      </footer>
    </div>
  )
}
