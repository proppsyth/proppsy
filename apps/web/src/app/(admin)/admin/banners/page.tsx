import Link from 'next/link'
import { Plus, Image as ImageIcon } from 'lucide-react'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import BannerCard from './BannerCard'

export const metadata: Metadata = { title: 'แบนเนอร์ — Admin' }

const POSITIONS = [
  { key: 'home_top',        label: 'หน้าแรก (บนสุด)' },
  { key: 'listing_top',     label: 'หน้า Listing (บน)' },
  { key: 'dashboard_top',   label: 'Dashboard (บน)' },
  { key: 'listing_sidebar', label: 'Listing (Sidebar)' },
]

export default async function AdminBannersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: banners } = await supabase
    .from('banners')
    .select('*')
    .order('position')
    .order('sort_order')

  const all    = banners ?? []
  const active = all.filter(b => b.is_active)

  // Count by position
  const byPosition = POSITIONS.map(p => ({
    ...p,
    count: all.filter(b => b.position === p.key).length,
  }))

  return (
    <div className="p-4 lg:p-8 pt-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-pink-50 rounded-xl flex items-center justify-center">
            <ImageIcon className="w-5 h-5 text-pink-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">แบนเนอร์</h1>
            <p className="text-xs text-gray-400">จัดการแบนเนอร์และ promotional content</p>
          </div>
        </div>
        <Link
          href="/admin/banners/new"
          className="flex items-center gap-2 px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white text-sm font-medium rounded-xl transition"
        >
          <Plus className="w-4 h-4" />
          เพิ่มแบนเนอร์
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
        <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">{all.length}</p>
          <p className="text-xs text-gray-400 mt-0.5">ทั้งหมด</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{active.length}</p>
          <p className="text-xs text-gray-400 mt-0.5">เปิดใช้งาน</p>
        </div>
        {byPosition.filter(p => p.count > 0).slice(0, 1).map(p => (
          <div key={p.key} className="bg-white rounded-xl border border-gray-100 p-4 text-center">
            <p className="text-2xl font-bold text-pink-600">{p.count}</p>
            <p className="text-xs text-gray-400 mt-0.5">{p.label}</p>
          </div>
        ))}
      </div>

      {/* Position breakdown chips */}
      <div className="flex gap-2 flex-wrap mb-5">
        {byPosition.map(p => (
          <div key={p.key} className="px-3 py-1.5 bg-gray-100 rounded-full text-xs text-gray-600">
            {p.label}: <span className="font-semibold">{p.count}</span>
          </div>
        ))}
      </div>

      {/* Grouped by position */}
      {all.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
          <ImageIcon className="w-10 h-10 mx-auto mb-3 text-gray-200" />
          <p className="text-gray-400 text-sm">ยังไม่มีแบนเนอร์</p>
          <Link href="/admin/banners/new" className="text-sm text-pink-600 hover:underline mt-2 inline-block">
            เพิ่มแบนเนอร์แรก →
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {POSITIONS.map(pos => {
            const group = all.filter(b => b.position === pos.key)
            if (group.length === 0) return null
            return (
              <div key={pos.key}>
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">{pos.label}</h2>
                <div className="space-y-3">
                  {group.map(b => (
                    <BannerCard key={b.id} banner={b} />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
