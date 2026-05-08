import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import StockForm from '../StockForm'
import { resolvePlan, PLAN_LIMITS } from '@/types'

export const metadata: Metadata = { title: 'เพิ่มทรัพย์ใหม่' }

export default async function NewStockPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: profile }, { data: owners }, { data: projects }, { count: stockCount }] = await Promise.all([
    supabase.from('profiles').select('plan').eq('id', user.id).single(),
    supabase.from('owners').select('id, nickname, first_name_th, last_name_th, phone').eq('agent_uid', user.id).order('created_at', { ascending: false }),
    supabase.from('projects').select('id, name_th, name_en').order('name_th'),
    supabase.from('stock').select('*', { count: 'exact', head: true }).eq('agent_uid', user.id),
  ])

  const plan = resolvePlan(profile?.plan)
  const limits = PLAN_LIMITS[plan]
  const isAtLimit = limits.maxStock !== null && (stockCount ?? 0) >= limits.maxStock

  if (isAtLimit) {
    return (
      <div className="p-4 lg:p-8 pt-6 max-w-3xl">
        <h1 className="text-xl font-bold text-gray-900 mb-6">เพิ่มทรัพย์ใหม่</h1>
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-8 text-center">
          <p className="text-3xl mb-3">📦</p>
          <h2 className="text-lg font-bold text-amber-800 mb-2">ถึงขีดจำกัดแพ็กเกจ Starter แล้ว</h2>
          <p className="text-sm text-amber-700 mb-1">
            แพ็กเกจ Starter รองรับทรัพย์สูงสุด <strong>{limits.maxStock} รายการ</strong>
          </p>
          <p className="text-sm text-amber-600 mb-6">
            ปัจจุบันคุณมีทรัพย์ {stockCount} รายการในระบบ
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
      <h1 className="text-xl font-bold text-gray-900 mb-6">เพิ่มทรัพย์ใหม่</h1>
      <StockForm
        owners={owners ?? []}
        projects={projects ?? []}
        allowAI={limits.ai}
      />
    </div>
  )
}
