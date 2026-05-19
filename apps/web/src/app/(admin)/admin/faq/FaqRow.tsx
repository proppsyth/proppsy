'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { toggleFaqPublished, deleteFaq } from './actions'

interface FaqItem {
  id: string
  question: string
  answer: string
  sort_order: number
  is_published: boolean
}

export default function FaqRow({ faq }: { faq: FaqItem }) {
  const [published, setPublished]           = useState(faq.is_published)
  const [togglePending, startToggle]        = useTransition()
  const [deletePending, startDelete]        = useTransition()
  const [confirmDelete, setConfirmDelete]   = useState(false)

  function handleToggle() {
    const prev = published
    setPublished(!prev)
    startToggle(async () => {
      await toggleFaqPublished(faq.id, prev)
    })
  }

  function handleDeleteClick() {
    if (!confirmDelete) { setConfirmDelete(true); return }
    startDelete(async () => {
      await deleteFaq(faq.id)
    })
  }

  const truncatedAnswer = faq.answer.length > 100
    ? faq.answer.slice(0, 100) + '...'
    : faq.answer

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-start gap-4">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-mono">#{faq.sort_order}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${published ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
            {published ? 'เผยแพร่แล้ว' : 'ซ่อน'}
          </span>
        </div>
        <p className="font-medium text-gray-900 text-sm line-clamp-2">{faq.question}</p>
        <p className="text-xs text-gray-400 mt-1 line-clamp-2">{truncatedAnswer}</p>
      </div>

      <div className="flex flex-col items-end gap-2 flex-shrink-0">
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
            href={`/admin/faq/${faq.id}/edit`}
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
