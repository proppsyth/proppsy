import Link from 'next/link'
import { Plus, BookOpen } from 'lucide-react'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ArticleCard from './ArticleCard'

export const metadata: Metadata = { title: 'บทความ — Admin' }

export default async function AdminArticlesPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>
}) {
  const { filter } = await searchParams

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: articles } = await supabase
    .from('articles')
    .select('*')
    .order('created_at', { ascending: false })

  const all       = articles ?? []
  const published = all.filter(a => a.is_published)
  const draft     = all.filter(a => !a.is_published)

  const filtered =
    filter === 'published' ? published :
    filter === 'draft'     ? draft     :
    all

  const FILTERS = [
    { key: undefined,     label: 'ทั้งหมด',        count: all.length },
    { key: 'published',   label: 'เผยแพร่แล้ว',    count: published.length },
    { key: 'draft',       label: 'ฉบับร่าง',       count: draft.length },
  ]

  return (
    <div className="p-4 lg:p-8 pt-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">บทความ / Blog</h1>
            <p className="text-xs text-gray-400">จัดการบทความและเนื้อหา SEO</p>
          </div>
        </div>
        <Link
          href="/admin/articles/new"
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition"
        >
          <Plus className="w-4 h-4" />
          สร้างบทความ
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">{all.length}</p>
          <p className="text-xs text-gray-400 mt-0.5">ทั้งหมด</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{published.length}</p>
          <p className="text-xs text-gray-400 mt-0.5">เผยแพร่แล้ว</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
          <p className="text-2xl font-bold text-gray-400">{draft.length}</p>
          <p className="text-xs text-gray-400 mt-0.5">ฉบับร่าง</p>
        </div>
      </div>

      {/* Filter chips */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {FILTERS.map(f => {
          const isActive = (filter ?? undefined) === f.key
          return (
            <Link
              key={f.label}
              href={f.key ? `/admin/articles?filter=${f.key}` : '/admin/articles'}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {f.label} ({f.count})
            </Link>
          )
        })}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
          <BookOpen className="w-10 h-10 mx-auto mb-3 text-gray-200" />
          <p className="text-gray-400 text-sm">ยังไม่มีบทความ</p>
          <Link href="/admin/articles/new" className="text-sm text-blue-600 hover:underline mt-2 inline-block">
            สร้างบทความแรก →
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(a => (
            <ArticleCard key={a.id} article={a} />
          ))}
        </div>
      )}
    </div>
  )
}
