'use client'

import { useState } from 'react'
import { generateFacebookPost } from './ai-post-actions'

export default function AiPostButton({ stockId, isPublished }: { stockId: string; isPublished: boolean }) {
  const [loading, setLoading] = useState(false)
  const [post, setPost] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  async function handleGenerate() {
    setLoading(true)
    setError(null)
    setPost(null)
    const result = await generateFacebookPost({ stockId })
    setLoading(false)
    if (result.error) {
      setError(result.error)
    } else {
      setPost(result.post ?? null)
    }
  }

  async function handleCopy() {
    if (!post) return
    await navigator.clipboard.writeText(post)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-base">✨</span>
          <h3 className="text-sm font-semibold text-gray-700">สร้างโพสต์ Facebook ด้วย AI</h3>
        </div>
        {isPublished ? (
          <button
            type="button"
            onClick={handleGenerate}
            disabled={loading}
            className="px-3 py-1.5 bg-blue-600 active:bg-blue-800 disabled:bg-blue-300 text-white text-xs font-medium rounded-lg transition-colors"
          >
            {loading ? 'กำลังสร้าง...' : 'สร้างโพสต์'}
          </button>
        ) : (
          <span className="text-xs text-gray-400 bg-gray-100 px-2.5 py-1 rounded-lg">
            ต้องเผยแพร่ก่อน
          </span>
        )}
      </div>

      {!isPublished && (
        <p className="text-xs text-gray-400">เผยแพร่ทรัพย์นี้ก่อนเพื่อสร้างโพสต์ Facebook</p>
      )}

      {loading && (
        <div className="flex items-center gap-2 text-xs text-gray-400 py-3">
          <span className="inline-block w-4 h-4 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin" />
          AI กำลังเขียนโพสต์...
        </div>
      )}

      {error && (
        <div className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</div>
      )}

      {post && (
        <div className="mt-2">
          <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-700 whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto">
            {post}
          </div>
          <button
            type="button"
            onClick={handleCopy}
            className="mt-2 w-full py-2 text-xs font-medium rounded-lg border border-gray-200 text-gray-600 active:bg-gray-100 transition-colors"
          >
            {copied ? '✓ คัดลอกแล้ว' : 'คัดลอกโพสต์'}
          </button>
        </div>
      )}
    </div>
  )
}
