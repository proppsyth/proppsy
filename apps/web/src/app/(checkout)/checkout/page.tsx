import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import type { Metadata } from 'next'
import CheckoutForm from './CheckoutForm'

export const metadata: Metadata = { title: 'ชำระเงิน — Proppsy' }

const PLAN_INFO = {
  standard: { name: 'Standard', monthly: 990, yearly: 8900 },
  ai_pro: { name: 'AI Pro', monthly: 1290, yearly: 11900 },
  professional: { name: 'Standard', monthly: 990, yearly: 8900 }, // backward compat
} as const

type PlanKey = 'standard' | 'ai_pro'

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string; billing?: string }>
}) {
  const params = await searchParams
  const planKey: PlanKey = params.plan === 'ai_pro' ? 'ai_pro' : 'standard'
  const billing: 'monthly' | 'yearly' =
    params.billing === 'yearly' ? 'yearly' : 'monthly'

  const info = PLAN_INFO[planKey]
  const amount = billing === 'yearly' ? info.yearly : info.monthly

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
          <h1 className="text-xl font-bold text-gray-900 mb-1">สั่งซื้อแพ็กเกจ</h1>
          <p className="text-sm text-gray-400 mb-6">
            {info.name} · {billing === 'yearly' ? 'ชำระรายปี' : 'ชำระรายเดือน'}
          </p>

          {/* Plan toggle */}
          <div className="flex gap-2 mb-3">
            <Link
              href={`/checkout?plan=standard&billing=${billing}`}
              className={`flex-1 py-2 text-center text-xs rounded-xl border transition font-medium ${
                planKey === 'standard'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
              }`}
            >
              Standard
            </Link>
            <Link
              href={`/checkout?plan=ai_pro&billing=${billing}`}
              className={`flex-1 py-2 text-center text-xs rounded-xl border transition font-medium ${
                planKey === 'ai_pro'
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-emerald-300'
              }`}
            >
              AI Pro
            </Link>
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
              รายเดือน ฿{info.monthly.toLocaleString('th-TH')}
            </Link>
            <Link
              href={`/checkout?plan=${planKey}&billing=yearly`}
              className={`flex-1 py-2 text-center text-sm rounded-xl border transition font-medium relative ${
                billing === 'yearly'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
              }`}
            >
              รายปี ฿{info.yearly.toLocaleString('th-TH')}
              <span className={`absolute -top-2 -right-1 text-xs px-1.5 py-0.5 rounded-full font-semibold ${billing === 'yearly' ? 'bg-white text-blue-600' : 'bg-green-500 text-white'}`}>
                ประหยัด
              </span>
            </Link>
          </div>

          <CheckoutForm
            plan={planKey}
            billing={billing}
            amount={amount}
            planName={info.name}
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
