import Link from 'next/link'
import { notFound } from 'next/navigation'
import StorageImage from '@/components/shared/StorageImage'
import { ArrowLeft } from 'lucide-react'
import type { Metadata } from 'next'
import { createServiceClient } from '@/lib/supabase/server'
import PublicNav from '@/components/shared/PublicNav'
import PublicFooter from '@/components/shared/PublicFooter'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('news')
    .select('title, summary, cover_url, created_at')
    .eq('id', id)
    .eq('published', true)
    .single()

  if (!data?.title) return { title: 'ข่าวสาร — Proppsy' }

  const title = `${data.title} — Proppsy`
  const description = data.summary ?? 'อ่านข่าวสารอสังหาริมทรัพย์จาก Proppsy'

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'article',
      ...(data.cover_url && { images: [{ url: data.cover_url, width: 1200, height: 628, alt: data.title }] }),
      ...(data.created_at && { publishedTime: data.created_at }),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      ...(data.cover_url && { images: [data.cover_url] }),
    },
  }
}

export default async function NewsDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createServiceClient()

  const { data: news } = await supabase
    .from('news')
    .select('*')
    .eq('id', id)
    .eq('published', true)
    .single()

  if (!news) notFound()

  return (
    <div className="min-h-screen bg-gray-50">
      <PublicNav />

      <article className="max-w-3xl mx-auto px-4 py-6">
        <Link href="/news" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition mb-5 w-fit">
          <ArrowLeft className="w-4 h-4" />
          ข่าวสารทั้งหมด
        </Link>

        {news.cover_url && (
          <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-gray-100 mb-6">
            <StorageImage src={news.cover_url} alt={news.title} fill className="object-cover" sizes="100vw" bucket="news" />
          </div>
        )}

        <p className="text-xs text-gray-400 mb-2">
          {new Date(news.created_at).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
        <h1 className="text-2xl font-bold text-gray-900 mb-3">{news.title}</h1>
        {news.summary && <p className="text-gray-500 text-base mb-5 leading-relaxed">{news.summary}</p>}
        {news.content && (
          <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap leading-relaxed">
            {news.content}
          </div>
        )}
      </article>

      <PublicFooter />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'NewsArticle',
            headline: news.title,
            ...(news.summary && { description: news.summary }),
            ...(news.cover_url && { image: [news.cover_url] }),
            datePublished: news.created_at,
            url: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.proppsy.com'}/news/${news.id}`,
            publisher: {
              '@type': 'Organization',
              name: 'Proppsy',
              url: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.proppsy.com',
            },
          }),
        }}
      />
    </div>
  )
}
