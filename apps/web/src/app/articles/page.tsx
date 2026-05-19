import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { BookOpen, ArrowLeft } from 'lucide-react'
import PublicNav from '@/components/shared/PublicNav'
import { createServiceClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: 'บทความ — Proppsy',
  description: 'บทความ คู่มือ และข้อมูลตลาดอสังหาริมทรัพย์จาก Proppsy',
}

const CATEGORY_LABELS: Record<string, string> = {
  general: 'ทั่วไป',
  guide:   'คู่มือ',
  market:  'ตลาด',
  update:  'อัปเดต',
}

const CATEGORY_COLORS: Record<string, string> = {
  general: 'bg-gray-100 text-gray-600',
  guide:   'bg-blue-100 text-blue-700',
  market:  'bg-purple-100 text-purple-700',
  update:  'bg-orange-100 text-orange-700',
}

interface Article {
  id: string
  title: string
  slug: string
  excerpt: string | null
  cover_url: string | null
  category: string
  published_at: string | null
  created_at: string
}

export default async function ArticlesPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>
}) {
  const { category } = await searchParams
  const supabase = createServiceClient()

  let query = supabase
    .from('articles')
    .select('id, title, slug, excerpt, cover_url, category, published_at, created_at')
    .eq('is_published', true)
    .order('published_at', { ascending: false })

  if (category && CATEGORY_LABELS[category]) {
    query = query.eq('category', category)
  }

  const { data } = await query
  const articles = (data ?? []) as Article[]

  return (
    <div className="min-h-screen bg-gray-50">
      <PublicNav />

      <div className="max-w-4xl mx-auto px-4 py-8 pb-16">
        <Link
          href="/"
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition mb-6 w-fit"
        >
          <ArrowLeft className="w-4 h-4" />
          กลับหน้าหลัก
        </Link>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center flex-shrink-0">
            <BookOpen className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">บทความ</h1>
            <p className="text-xs text-gray-500">บทความ คู่มือ และข้อมูลตลาดอสังหาริมทรัพย์</p>
          </div>
        </div>

        {/* Category filter */}
        <div className="flex flex-wrap gap-2 mb-6">
          <Link
            href="/articles"
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition border ${
              !category ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
            }`}
          >
            ทั้งหมด
          </Link>
          {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
            <Link
              key={key}
              href={`/articles?category=${key}`}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition border ${
                category === key
                  ? `${CATEGORY_COLORS[key]} border-transparent`
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
              }`}
            >
              {label}
            </Link>
          ))}
        </div>

        {articles.length === 0 ? (
          <div className="text-center py-24 text-gray-400">
            <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-25" />
            <p className="text-sm">
              {category ? `ยังไม่มีบทความในหมวด ${CATEGORY_LABELS[category] ?? category}` : 'ยังไม่มีบทความ'}
            </p>
            {category && (
              <Link href="/articles" className="text-sm text-blue-600 hover:underline mt-2 inline-block">
                ดูทั้งหมด →
              </Link>
            )}
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {articles.map(article => {
              const dateStr = new Date(article.published_at ?? article.created_at).toLocaleDateString('th-TH', {
                year: 'numeric', month: 'long', day: 'numeric',
              })
              return (
                <Link
                  key={article.id}
                  href={`/articles/${article.slug}`}
                  className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden block"
                >
                  {/* Cover */}
                  <div className="relative aspect-[16/9] bg-gray-100">
                    {article.cover_url ? (
                      <Image
                        src={article.cover_url}
                        alt={article.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                        sizes="(max-width: 640px) 100vw, 50vw"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <BookOpen className="w-10 h-10 text-gray-200" />
                      </div>
                    )}
                    <span className={`absolute top-3 left-3 text-xs px-2.5 py-1 rounded-full font-medium ${CATEGORY_COLORS[article.category] ?? 'bg-gray-100 text-gray-600'}`}>
                      {CATEGORY_LABELS[article.category] ?? article.category}
                    </span>
                  </div>

                  {/* Body */}
                  <div className="p-4">
                    <p className="text-sm font-semibold text-gray-900 line-clamp-2 mb-1.5 group-hover:text-blue-600 transition-colors">
                      {article.title}
                    </p>
                    {article.excerpt && (
                      <p className="text-xs text-gray-500 line-clamp-2 mb-2">{article.excerpt}</p>
                    )}
                    <p className="text-xs text-gray-400">{dateStr}</p>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>

      <footer className="border-t border-gray-100 py-6 text-center text-xs text-gray-400">
        © {new Date().getFullYear()} Proppsy · Real Estate Management Platform
      </footer>
    </div>
  )
}
