import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import ContractWizard from '../ContractWizard'
import { resolvePlan, PLAN_LIMITS } from '@/types'

export const metadata: Metadata = { title: 'สร้างสัญญาใหม่' }

export default async function NewContractPage({
  searchParams,
}: {
  searchParams: Promise<{ parent?: string; type?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const [{ data: profile }, { count: contractsThisMonth }] = await Promise.all([
    supabase.from('profiles').select('plan').eq('id', user.id).single(),
    supabase.from('contracts').select('*', { count: 'exact', head: true }).eq('agent_uid', user.id).gte('created_at', startOfMonth),
  ])

  const plan = resolvePlan(profile?.plan)
  const limits = PLAN_LIMITS[plan]
  const isAtLimit = limits.maxContractsPerMonth !== null && (contractsThisMonth ?? 0) >= limits.maxContractsPerMonth

  if (isAtLimit) {
    return (
      <div className="p-4 lg:p-8 pt-6 max-w-3xl">
        <h1 className="text-xl font-bold text-gray-900 mb-6">สร้างสัญญาใหม่</h1>
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-8 text-center">
          <p className="text-3xl mb-3">📄</p>
          <h2 className="text-lg font-bold text-amber-800 mb-2">ถึงขีดจำกัดแพ็กเกจ Starter แล้ว</h2>
          <p className="text-sm text-amber-700 mb-1">
            แพ็กเกจ Starter ออกสัญญาได้สูงสุด <strong>{limits.maxContractsPerMonth} ฉบับ/เดือน</strong>
          </p>
          <p className="text-sm text-amber-600 mb-6">
            เดือนนี้คุณออกสัญญาไปแล้ว {contractsThisMonth} ฉบับ
          </p>
          <Link href="/profile" className="inline-block px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition">
            ดูข้อมูลแพ็กเกจ
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-8 pt-6 max-w-3xl">
      <h1 className="text-xl font-bold text-gray-900 mb-6">สร้างสัญญาใหม่</h1>
      <ContractWizard initialParentId={params.parent} initialDocType={params.type} />
    </div>
  )
}
