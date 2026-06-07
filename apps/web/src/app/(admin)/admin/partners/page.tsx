import Link from 'next/link'
import { Plus, Handshake } from 'lucide-react'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import PartnerCard from './PartnerCard'

export const metadata: Metadata = { title: 'พาร์ทเนอร์ — Admin' }

export default async function AdminPartnersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: partners } = await supabase
    .from('partners')
    .select('*')
    .order('sort_order')
    .order('created_at', { ascending: false })

  const all    = partners ?? []
  const active = all.filter(p => p.is_active)
  const hidden = all.filter(p => !p.is_active)

  return (
    <div className="p-4 lg:p-8 pt-6">
      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-teal-50 rounded-xl flex items-center justify-center">
            <Handshake className="w-5 h-5 text-teal-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">พาร์ทเนอร์ / ลูกค้า</h1>
            <p className="text-xs text-gray-400">บริษัทและทีมที่แสดงในส่วน &ldquo;เชื่อใจโดย...&rdquo; บนหน้าแรก</p>
          </div>
        </div>
        <Link
          href="/admin/partners/new"
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition"
        >
          <Plus className="w-4 h-4" />
          เพิ่มพาร์ทเนอร์
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">{all.length}</p>
          <p className="text-xs text-gray-400 mt-0.5">ทั้งหมด</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{active.length}</p>
          <p className="text-xs text-gray-400 mt-0.5">แสดงบนเว็บ</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
          <p className="text-2xl font-bold text-gray-400">{hidden.length}</p>
          <p className="text-xs text-gray-400 mt-0.5">ซ่อน</p>
        </div>
      </div>

      {all.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
          <Handshake className="w-10 h-10 mx-auto mb-3 text-gray-200" />
          <p className="text-gray-400 text-sm">ยังไม่มีพาร์ทเนอร์</p>
          <Link href="/admin/partners/new" className="text-sm text-blue-600 hover:underline mt-2 inline-block">
            เพิ่มพาร์ทเนอร์แรก →
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {all.map(p => (
            <PartnerCard key={p.id} partner={p} />
          ))}
        </div>
      )}
    </div>
  )
}
