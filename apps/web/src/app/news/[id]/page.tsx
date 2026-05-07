import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()
  const { data } = await supabase.from('news').select('title').eq('id', id).eq('published', true).single()
  return { title: data?.title ? `${data.title} — Proppsy` : 'ข่าวสาร — Proppsy' }
}

export default async function NewsDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: news } = await supabase
    .from('news')
    .select('*')
    .eq('id', id)
    .eq('published', true)
    .single()

  if (!news) notFound()

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-100 sticky top-0 z-10 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/logo/logo-icon.jpg" alt="Proppsy" width={28} height={28} className="object-contain rounded-lg" />
            <span className="font-bold text-lg text-gray-900">Proppsy</span>
          </Link>
          <div className="flex items-center gap-2">
            {user ? (
              <Link href="/dashboard" className="px-4 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition">
                แดชบอร์ด
              </Link>
            ) : (
              <Link href="/login" className="text-sm text-gray-600 hover:text-gray-900 transition">เข้าสู่ระบบ</Link>
            )}
          </div>
        </div>
      </nav>

      <article className="max-w-3xl mx-auto px-4 py-6">
        <Link href="/news" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition mb-5 w-fit">
          <ArrowLeft className="w-4 h-4" />
          ข่าวสารทั้งหมด
        </Link>

        {news.cover_url && (
          <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-gray-100 mb-6">
            <Image src={news.cover_url} alt={news.title} fill className="object-cover" sizes="100vw" />
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

      <footer className="border-t border-gray-100 mt-8 py-6 text-center text-xs text-gray-400">
        © {new Date().getFullYear()} Proppsy
      </footer>
    </div>
  )
}
