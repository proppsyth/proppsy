'use client'

import { useState } from 'react'
import { generateFacebookPost, saveAiPost } from './ai-post-actions'
import { useAiQuota } from '@/hooks/useAiQuota'

export default function AiPostButton({ stockId, savedPost }: { stockId: string; savedPost: string | null }) {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [post, setPost] = useState<string>(savedPost ?? '')
  const [savedText, setSavedText] = useState<string>(savedPost ?? '')
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [savedFlash, setSavedFlash] = useState(false)
  const { quota } = useAiQuota()

  const hasContent = post.trim().length > 0
  const dirty = post !== savedText

  async function handleGenerate() {
    setLoading(true)
    setError(null)
    const result = await generateFacebookPost({ stockId })
    setLoading(false)
    if (result.error) setError(result.error)
    else setPost(result.post ?? '')
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    const res = await saveAiPost(stockId, post)
    setSaving(false)
    if (res.error) { setError(res.error); return }
    setSavedText(post)
    setSavedFlash(true)
    setTimeout(() => setSavedFlash(false), 2000)
  }

  async function handleCopy() {
    if (!hasContent) return
    await navigator.clipboard.writeText(post)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const remaining = quota ? quota.limit - quota.used : null

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-gray-700">โพสต์ขายด้วย AI</h3>
          {remaining !== null && (
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${remaining > 5 ? 'bg-green-100 text-green-700' : remaining > 0 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-600'}`}>
              เหลือ {remaining}/{quota?.limit}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={handleGenerate}
          disabled={loading || remaining === 0}
          className="px-3 py-1.5 bg-blue-600 active:bg-blue-800 disabled:bg-gray-300 text-white text-xs font-medium rounded-lg transition-colors"
        >
          {loading ? 'กำลังสร้าง...' : hasContent ? 'สร้างใหม่ด้วย AI' : 'สร้างโพสต์'}
        </button>
      </div>

      {savedPost && !loading && (
        <p className="text-xs text-gray-400 mb-2">มีโพสต์ที่บันทึกไว้ — แก้ไขแล้วกดบันทึก หรือคัดลอกไปใช้ได้เลย</p>
      )}

      {loading && (
        <div className="flex items-center gap-2 text-xs text-gray-400 py-3">
          <span className="inline-block w-4 h-4 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin" />
          AI กำลังเขียนโพสต์...
        </div>
      )}

      {error && (
        <div className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2 mb-2">{error}</div>
      )}

      {hasContent && !loading && (
        <div className="space-y-2">
          <textarea
            value={post}
            onChange={e => setPost(e.target.value)}
            rows={12}
            className="w-full bg-gray-50 rounded-lg p-3 text-xs text-gray-700 leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !dirty}
              className="flex-1 py-2 text-xs font-medium rounded-lg bg-blue-600 active:bg-blue-800 disabled:bg-gray-200 disabled:text-gray-400 text-white transition-colors"
            >
              {saving ? 'กำลังบันทึก...' : savedFlash ? 'บันทึกแล้ว ✓' : dirty ? 'บันทึก' : 'บันทึกแล้ว'}
            </button>
            <button
              type="button"
              onClick={handleCopy}
              className="flex-1 py-2 text-xs font-medium rounded-lg border border-gray-200 text-gray-600 active:bg-gray-100 transition-colors"
            >
              {copied ? 'คัดลอกแล้ว' : 'คัดลอกโพสต์'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
