'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { updateNews, deleteNews } from './actions'

interface News {
  id: string
  title: string
  summary?: string | null
  published: boolean
  created_at: string
}

export default function NewsCard({ news }: { news: News }) {
  const [published, setPublished] = useState(news.published)
  const [togglePending, startToggle] = useTransition()
  const [deletePending, startDelete] = useTransition()

  function handleToggle() {
    const next = !published
    setPublished(next)
    startToggle(async () => {
      await updateNews(news.id, { published: next })
    })
  }

  function handleDelete() {
    if (!confirm(`ลบข่าว "${news.title}"?\nการกระทำนี้ไม่สามารถย้อนกลับได้`)) return
    startDelete(async () => {
      await deleteNews(news.id)
    })
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-start gap-4">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${published ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
            {published ? 'เผยแพร่แล้ว' : 'ฉบับร่าง'}
          </span>
          <span className="text-xs text-gray-400">
            {new Date(news.created_at).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })}
          </span>
        </div>
        <p className="font-medium text-gray-900 line-clamp-1">{news.title}</p>
        {news.summary && <p className="text-xs text-gray-400 line-clamp-1 mt-0.5">{news.summary}</p>}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={handleToggle}
          disabled={togglePending}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition disabled:opacity-50 ${
            published ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' : 'bg-green-50 text-green-700 hover:bg-green-100'
          }`}
        >
          {published ? 'ซ่อน' : 'เผยแพร่'}
        </button>
        <Link
          href={`/admin/news/${news.id}/edit`}
          className="px-3 py-1.5 text-xs font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg transition"
        >
          แก้ไข
        </Link>
        <button
          onClick={handleDelete}
          disabled={deletePending}
          className="px-3 py-1.5 text-xs font-medium bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition disabled:opacity-50"
        >
          {deletePending ? '...' : 'ลบ'}
        </button>
      </div>
    </div>
  )
}
