import Link from 'next/link'
import { Newspaper, ArrowLeft } from 'lucide-react'
import StorageImage from '@/components/shared/StorageImage'
import type { Metadata } from 'next'
import { createServiceClient } from '@/lib/supabase/server'
import PublicNav from '@/components/shared/PublicNav'
import PublicFooter from '@/components/shared/PublicFooter'

export const metadata: Metadata = { title: 'ข่าวสาร — Proppsy' }

export default async function NewsPage() {
  const supabase = createServiceClient()

  const { data: news } = await supabase
    .from('news')
    .select('id, title, summary, cover_url, created_at')
    .eq('published', true)
    .order('created_at', { ascending: false })

  return (
    <div className="min-h-screen bg-gray-50">
      <PublicNav />

      <div className="max-w-4xl mx-auto px-4 py-6">
        <Link href="/" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition mb-5 w-fit">
          <ArrowLeft className="w-4 h-4" />
          กลับหน้าหลัก
        </Link>

        <div className="flex items-center gap-3 mb-6">
          <Newspaper className="w-6 h-6 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900">ข่าวสาร & อัปเดต</h1>
        </div>

        {(news?.length ?? 0) === 0 ? (
          <div className="text-center py-24 text-gray-400">
            <Newspaper className="w-12 h-12 mx-auto mb-3 opacity-25" />
            <p className="text-sm">ยังไม่มีข่าวสาร</p>
          </div>
        ) : (
          <div className="space-y-4">
            {news!.map(n => (
              <Link
                key={n.id}
                href={`/news/${n.id}`}
                className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition block"
              >
                <div className="flex gap-4">
                  {n.cover_url && (
                    <div className="relative w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
                      <StorageImage src={n.cover_url} alt={n.title} fill className="object-cover" sizes="80px" bucket="news" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-900 mb-1 line-clamp-2">{n.title}</p>
                    {n.summary && <p className="text-xs text-gray-500 line-clamp-2">{n.summary}</p>}
                    <p className="text-xs text-gray-300 mt-2">
                      {new Date(n.created_at).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <PublicFooter />
    </div>
  )
}
