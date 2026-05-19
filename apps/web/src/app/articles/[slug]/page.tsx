import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, Calendar, Tag } from 'lucide-react'
import PublicNav from '@/components/shared/PublicNav'
import { createServiceClient } from '@/lib/supabase/server'

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

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('articles')
    .select('title, excerpt, cover_url')
    .eq('slug', slug)
    .eq('is_published', true)
    .single()

  if (!data) return { title: 'ไม่พบบทความ — Proppsy' }

  return {
    title: `${data.title} — Proppsy`,
    description: data.excerpt ?? undefined,
    openGraph: {
      title: data.title,
      description: data.excerpt ?? undefined,
      type: 'article',
      ...(data.cover_url && { images: [{ url: data.cover_url }] }),
    },
  }
}

export default async function ArticleDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const supabase = createServiceClient()

  const { data: article } = await supabase
    .from('articles')
    .select('id, title, slug, excerpt, content, cover_url, category, published_at, created_at')
    .eq('slug', slug)
    .eq('is_published', true)
    .single()

  if (!article) notFound()

  const dateStr = new Date(article.published_at ?? article.created_at).toLocaleDateString('th-TH', {
    year: 'numeric', month: 'long', day: 'numeric',
  })

  // Fetch related articles (same category, not this one)
  const { data: related } = await supabase
    .from('articles')
    .select('id, title, slug, cover_url, category, published_at, created_at')
    .eq('is_published', true)
    .eq('category', article.category)
    .neq('id', article.id)
    .order('published_at', { ascending: false })
    .limit(3)

  return (
    <div className="min-h-screen bg-gray-50">
      <PublicNav />

      <div className="max-w-3xl mx-auto px-4 py-8 pb-16">
        <Link
          href="/articles"
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition mb-6 w-fit"
        >
          <ArrowLeft className="w-4 h-4" />
          กลับหน้าบทความ
        </Link>

        {/* Article */}
        <article className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {/* Cover */}
          {article.cover_url && (
            <div className="relative aspect-[16/9] bg-gray-100">
              <Image
                src={article.cover_url}
                alt={article.title}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 768px"
                priority
              />
            </div>
          )}

          <div className="p-6 sm:p-8">
            {/* Meta */}
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <span className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium ${CATEGORY_COLORS[article.category] ?? 'bg-gray-100 text-gray-600'}`}>
                <Tag className="w-3 h-3" />
                {CATEGORY_LABELS[article.category] ?? article.category}
              </span>
              <span className="flex items-center gap-1 text-xs text-gray-400">
                <Calendar className="w-3 h-3" />
                {dateStr}
              </span>
            </div>

            {/* Title */}
            <h1 className="text-2xl font-bold text-gray-900 mb-3 leading-snug">{article.title}</h1>

            {/* Excerpt */}
            {article.excerpt && (
              <p className="text-base text-gray-500 mb-6 leading-relaxed border-l-4 border-blue-200 pl-4 italic">
                {article.excerpt}
              </p>
            )}

            {/* Content */}
            {article.content ? (
              <div className="prose prose-sm prose-gray max-w-none text-gray-700 leading-relaxed whitespace-pre-line">
                {article.content}
              </div>
            ) : (
              <p className="text-gray-400 text-sm italic">ยังไม่มีเนื้อหา</p>
            )}
          </div>
        </article>

        {/* Related articles */}
        {(related ?? []).length > 0 && (
          <div className="mt-10">
            <h2 className="text-base font-semibold text-gray-700 mb-4">บทความที่เกี่ยวข้อง</h2>
            <div className="grid sm:grid-cols-3 gap-3">
              {related!.map(r => (
                <Link
                  key={r.id}
                  href={`/articles/${r.slug}`}
                  className="group bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden block"
                >
                  <div className="relative aspect-video bg-gray-100">
                    {r.cover_url ? (
                      <Image
                        src={r.cover_url}
                        alt={r.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                        sizes="33vw"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-gray-200">
                        <Tag className="w-6 h-6" />
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="text-xs font-medium text-gray-800 line-clamp-2 group-hover:text-blue-600 transition-colors">
                      {r.title}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(r.published_at ?? r.created_at).toLocaleDateString('th-TH', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      <footer className="border-t border-gray-100 py-6 text-center text-xs text-gray-400">
        © {new Date().getFullYear()} Proppsy · Real Estate Management Platform
      </footer>
    </div>
  )
}
