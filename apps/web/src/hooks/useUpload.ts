'use client'

import { useState, useCallback } from 'react'
import {
  processPropertyImages,
  processToWebp,
  applyIdCardWatermark,
} from '@/lib/upload/imageProcessor'
import {
  uploadPublic,
  uploadPrivate,
  deleteStorageFile,
  extractStoragePath,
} from '@/lib/upload/storageService'

// ─── Types ───────────────────────────────────────────────────

export type UploadPhase = 'idle' | 'processing' | 'uploading' | 'done' | 'error'

export interface UploadProgress {
  phase: UploadPhase
  percent: number
  error?: string
}

const IDLE: UploadProgress = { phase: 'idle', percent: 0 }

// ─── usePropertyImages ────────────────────────────────────────
// Multi-image uploader for property photos (stock module).
// Generates main (1920px) + thumb (400px) WebP per image.

const STOCK_BUCKET = 'stock-photos'
const MAX_IMAGES = 20

export interface PropertyImagesState {
  mainUrls: string[]
  thumbUrls: string[]
  progress: UploadProgress
  addImages: (files: File[]) => Promise<void>
  removeImage: (index: number) => void
}

export function usePropertyImages(options: {
  stockId?: string
  initialMainUrls?: string[]
  initialThumbUrls?: string[]
} = {}): PropertyImagesState {
  const [mainUrls, setMainUrls] = useState<string[]>(options.initialMainUrls ?? [])
  const [thumbUrls, setThumbUrls] = useState<string[]>(options.initialThumbUrls ?? [])
  const [progress, setProgress] = useState<UploadProgress>(IDLE)

  const addImages = useCallback(async (files: File[]) => {
    const remaining = MAX_IMAGES - mainUrls.length
    if (remaining <= 0) {
      setProgress({ phase: 'error', percent: 0, error: `อัปโหลดได้สูงสุด ${MAX_IMAGES} รูปต่อทรัพย์` })
      return
    }
    const batch = files.slice(0, remaining)
    const invalid = batch.filter(f => !f.type.startsWith('image/'))
    if (invalid.length) {
      setProgress({ phase: 'error', percent: 0, error: 'กรุณาเลือกเฉพาะไฟล์รูปภาพ' })
      return
    }

    const newMain: string[] = []
    const newThumb: string[] = []
    const folder = options.stockId ? `${options.stockId}/` : 'temp/'

    for (let i = 0; i < batch.length; i++) {
      const file = batch[i]
      if (!file) continue
      setProgress({ phase: 'processing', percent: Math.round((i / batch.length) * 50) })
      const { main, thumb } = await processPropertyImages(file)

      setProgress({ phase: 'uploading', percent: 50 + Math.round((i / batch.length) * 50) })
      const ts = Date.now()
      const [mainUrl, thumbUrl] = await Promise.all([
        uploadPublic(STOCK_BUCKET, `${folder}${ts}-main.webp`, main),
        uploadPublic(STOCK_BUCKET, `${folder}${ts}-thumb.webp`, thumb),
      ])
      newMain.push(mainUrl)
      newThumb.push(thumbUrl)
    }

    setMainUrls(prev => [...prev, ...newMain])
    setThumbUrls(prev => [...prev, ...newThumb])
    setProgress({ phase: 'done', percent: 100 })
    setTimeout(() => setProgress(IDLE), 1500)
  }, [mainUrls.length, options.stockId])

  const removeImage = useCallback((index: number) => {
    const mainPath = mainUrls[index] ? extractStoragePath(mainUrls[index]) : null
    const thumbPath = thumbUrls[index] ? extractStoragePath(thumbUrls[index]) : null
    if (mainPath) deleteStorageFile(STOCK_BUCKET, mainPath).catch(() => {})
    if (thumbPath) deleteStorageFile(STOCK_BUCKET, thumbPath).catch(() => {})
    setMainUrls(prev => prev.filter((_, i) => i !== index))
    setThumbUrls(prev => prev.filter((_, i) => i !== index))
  }, [mainUrls, thumbUrls])

  return { mainUrls, thumbUrls, progress, addImages, removeImage }
}

// ─── useDocumentUpload ────────────────────────────────────────
// Single-file uploader for ID cards, signatures, profile photos, news covers.
// Supports both public and private (signed URL) buckets.

export type DocumentCategory = 'id-cards' | 'signatures' | 'profiles' | 'news-covers' | 'article-covers' | 'banner-images' | 'partner-logos'

const DOCS_BUCKET = 'documents'
const SECURE_BUCKET = 'secure-documents'

export interface DocumentUploadState {
  // For public docs: full public URL. For private docs: storage path.
  url: string
  progress: UploadProgress
  upload: (file: File) => Promise<void>
  clear: () => void
}

export function useDocumentUpload(options: {
  category: DocumentCategory
  entityId?: string
  isPrivate?: boolean
  enableWatermark?: boolean
  initialUrl?: string
}): DocumentUploadState {
  const [url, setUrl] = useState(options.initialUrl ?? '')
  const [progress, setProgress] = useState<UploadProgress>(IDLE)

  const bucket = options.isPrivate ? SECURE_BUCKET : DOCS_BUCKET
  const folder = options.entityId
    ? `${options.category}/${options.entityId}/`
    : `${options.category}/`

  const upload = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setProgress({ phase: 'error', percent: 0, error: 'กรุณาเลือกเฉพาะไฟล์รูปภาพ' })
      return
    }

    try {
      setProgress({ phase: 'processing', percent: 30 })
      const blob = options.enableWatermark
        ? await applyIdCardWatermark(file)
        : await processToWebp(file, 1280)

      setProgress({ phase: 'uploading', percent: 65 })
      const path = `${folder}${Date.now()}.webp`

      if (options.isPrivate) {
        const oldPath = url || null
        if (oldPath) deleteStorageFile(bucket, oldPath).catch(() => {})
        const newPath = await uploadPrivate(bucket, path, blob)
        setUrl(newPath)
      } else {
        const oldPath = url ? extractStoragePath(url) : undefined
        const newUrl = await uploadPublic(bucket, path, blob, oldPath ?? undefined)
        setUrl(newUrl)
      }

      setProgress({ phase: 'done', percent: 100 })
      setTimeout(() => setProgress(IDLE), 1500)
    } catch (e) {
      setProgress({ phase: 'error', percent: 0, error: (e as Error).message })
    }
  }, [bucket, folder, options.enableWatermark, options.isPrivate, url])

  const clear = useCallback(() => {
    setUrl('')
    setProgress(IDLE)
  }, [])

  return { url, progress, upload, clear }
}
