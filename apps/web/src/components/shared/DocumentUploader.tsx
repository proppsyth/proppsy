'use client'

import { useRef } from 'react'
import Image from 'next/image'
import { Upload, X, Loader2, ShieldCheck, Stamp } from 'lucide-react'
import type { DocumentUploadState } from '@/hooks/useUpload'

const PHASE_LABEL: Record<string, string> = {
  processing: 'กำลังประมวลผล...',
  uploading: 'กำลังอัปโหลด...',
  done: 'อัปโหลดสำเร็จ',
}

interface Props extends DocumentUploadState {
  label?: string
  isPrivate?: boolean
  enableWatermark?: boolean
  accept?: string
}

export default function DocumentUploader({
  url,
  progress,
  upload,
  clear,
  label,
  isPrivate = false,
  enableWatermark = false,
  accept = 'image/*',
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const busy = progress.phase === 'processing' || progress.phase === 'uploading'
  const hasFile = !!url

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) await upload(file)
    e.target.value = ''
  }

  return (
    <div className="space-y-2">
      {/* Label row */}
      {label && (
        <div className="flex items-center gap-1.5 flex-wrap">
          <p className="text-xs font-medium text-gray-600">{label}</p>
          {isPrivate && (
            <span className="flex items-center gap-1 text-[10px] text-emerald-600 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded-full">
              <ShieldCheck className="w-3 h-3" />
              เก็บแบบส่วนตัว
            </span>
          )}
          {enableWatermark && (
            <span className="flex items-center gap-1 text-[10px] text-blue-600 bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded-full">
              <Stamp className="w-3 h-3" />
              ประทับตรา
            </span>
          )}
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={handleChange}
      />

      {/* Empty state — upload trigger */}
      {!hasFile && (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={busy}
          className="w-full flex items-center justify-center gap-2 py-4 border-2 border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50 active:bg-blue-100 rounded-xl text-sm font-medium text-gray-500 hover:text-blue-600 transition disabled:opacity-40"
        >
          {busy ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Upload className="w-4 h-4" />
          )}
          <span>{busy ? (PHASE_LABEL[progress.phase] ?? '...') : 'เลือกไฟล์'}</span>
        </button>
      )}

      {/* Filled state — preview */}
      {hasFile && (
        <div className="space-y-2">
          {isPrivate ? (
            // Private doc: show shield card instead of image
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
              <ShieldCheck className="w-8 h-8 text-emerald-500 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-gray-700">อัปโหลดแล้ว</p>
                <p className="text-xs text-gray-400">
                  เก็บแบบส่วนตัว — เข้าถึงได้เฉพาะผู้ที่ได้รับอนุญาต
                </p>
              </div>
            </div>
          ) : (
            // Public doc: show image preview
            <div className="relative w-full max-w-xs aspect-[3/2] rounded-xl overflow-hidden bg-gray-100 border border-gray-200">
              <Image
                src={url}
                alt="ตัวอย่างเอกสาร"
                fill
                sizes="320px"
                className="object-contain"
              />
            </div>
          )}
          <button
            type="button"
            onClick={clear}
            className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-600 transition"
          >
            <X className="w-3.5 h-3.5" />
            ลบและอัปโหลดใหม่
          </button>
        </div>
      )}

      {/* Progress bar */}
      {(busy || progress.phase === 'done') && (
        <div className="space-y-1">
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                progress.phase === 'done' ? 'bg-green-500' : 'bg-blue-500'
              }`}
              style={{ width: `${progress.percent}%` }}
            />
          </div>
          <p className="text-xs text-center text-gray-400">
            {PHASE_LABEL[progress.phase] ?? ''}
          </p>
        </div>
      )}

      {/* Error */}
      {progress.phase === 'error' && progress.error && (
        <p className="text-xs text-red-500 bg-red-50 border border-red-100 px-3 py-2 rounded-lg">
          {progress.error}
        </p>
      )}
    </div>
  )
}
