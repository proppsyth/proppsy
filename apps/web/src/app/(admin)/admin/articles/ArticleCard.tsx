'use client'

import { useState, useTransition } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { toggleArticlePublished, deleteArticle } from './actions'

interface Article {
  id: string
  title: string
  slug: string
  excerpt?: string | null
  cover_url?: string | null
  category: string
  is_published: boolean
  created_at: string
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

export default function ArticleCard({ article }: { article: Article }) {
  const [published, setPublished]           = useState(article.is_published)
  const [togglePending, startToggle]        = useTransition()
  const [deletePending, startDelete]        = useTransition()
  const [confirmDelete, setConfirmDelete]   = useState(false)

  function handleToggle() {
    const next = !published
    setPublished(next)
    startToggle(async () => {
      await toggleArticlePublished(article.id, !next)
    })
  }

  function handleDeleteClick() {
    if (!confirmDelete) { setConfirmDelete(true); return }
    startDelete(async () => {
      await deleteArticle(article.id)
    })
  }

  const categoryLabel = CATEGORY_LABELS[article.category] ?? article.category
  const categoryColor = CATEGORY_COLORS[article.category] ?? 'bg-gray-100 text-gray-600'

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex gap-4">
      {/* Cover thumbnail */}
      <div className="w-20 h-14 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
        {article.cover_url ? (
          <Image src={article.cover_url} alt={article.title} width={80} height={56} className="object-cover w-full h-full" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">ไม่มีรูป</div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${categoryColor}`}>
            {categoryLabel}
          </span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${published ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
            {published ? 'เผยแพร่แล้ว' : 'ฉบับร่าง'}
          </span>
          <span className="text-xs text-gray-400">
            {new Date(article.created_at).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })}
          </span>
        </div>
        <p className="font-medium text-gray-900 line-clamp-1 text-sm">{article.title}</p>
        {article.excerpt && (
          <p className="text-xs text-gray-400 line-clamp-1 mt-0.5">{article.excerpt}</p>
        )}
        <p className="text-xs text-gray-300 mt-0.5">/articles/{article.slug}</p>
      </div>

      {/* Actions */}
      <div className="flex flex-col items-end gap-2 flex-shrink-0">
        {/* Toggle switch */}
        <button
          type="button"
          onClick={handleToggle}
          disabled={togglePending}
          title={published ? 'คลิกเพื่อซ่อน' : 'คลิกเพื่อเผยแพร่'}
          className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 disabled:opacity-50 ${published ? 'bg-green-500' : 'bg-gray-200'}`}
        >
          <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${published ? 'translate-x-5' : ''}`} />
        </button>
        <div className="flex items-center gap-1.5">
          <Link
            href={`/admin/articles/${article.id}/edit`}
            className="px-3 py-1.5 text-xs font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg transition"
          >
            แก้ไข
          </Link>
          <button
            onClick={handleDeleteClick}
            onBlur={() => setConfirmDelete(false)}
            disabled={deletePending}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition disabled:opacity-50 ${
              confirmDelete
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-red-50 text-red-600 hover:bg-red-100'
            }`}
          >
            {deletePending ? '...' : confirmDelete ? 'ยืนยันลบ?' : 'ลบ'}
          </button>
        </div>
      </div>
    </div>
  )
}
