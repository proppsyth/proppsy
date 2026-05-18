import Link from 'next/link'
import { Plus, Newspaper } from 'lucide-react'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import NewsCard from './NewsCard'

export const metadata: Metadata = { title: 'จัดการข่าว — Admin' }

export default async function AdminNewsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: news } = await supabase
    .from('news')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <div className="p-4 lg:p-8 pt-6">
      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
            <Newspaper className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">จัดการข่าวสาร</h1>
            <p className="text-xs text-gray-400">ข่าวสาร อัปเดต Proppsy</p>
          </div>
        </div>
        <Link
          href="/admin/news/new"
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition"
        >
          <Plus className="w-4 h-4" />
          เพิ่มข่าว
        </Link>
      </div>

      {(news?.length ?? 0) === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
          <Newspaper className="w-10 h-10 mx-auto mb-3 text-gray-200" />
          <p className="text-gray-400 text-sm">ยังไม่มีข่าวสาร</p>
          <Link href="/admin/news/new" className="text-sm text-blue-600 hover:underline mt-2 inline-block">
            เพิ่มข่าวแรก →
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {news!.map(n => (
            <NewsCard key={n.id} news={n} />
          ))}
        </div>
      )}
    </div>
  )
}
