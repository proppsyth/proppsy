'use client'

import { useRef } from 'react'
import Image from 'next/image'
import { Camera, X, ImagePlus, Loader2 } from 'lucide-react'
import type { PropertyImagesState } from '@/hooks/useUpload'

const MAX = 20
const PHASE_LABEL: Record<string, string> = {
  processing: 'กำลังประมวลผลรูป...',
  uploading: 'กำลังอัปโหลด...',
  done: 'อัปโหลดสำเร็จ',
}

interface Props extends PropertyImagesState {
  label?: string
}

export default function ImageUploader({
  mainUrls,
  thumbUrls,
  progress,
  addImages,
  removeImage,
  label,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const busy = progress.phase === 'processing' || progress.phase === 'uploading'
  const full = mainUrls.length >= MAX

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (files.length) await addImages(files)
    e.target.value = ''
  }

  return (
    <div className="space-y-3">
      {label && <p className="text-xs font-medium text-gray-600">{label}</p>}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleChange}
      />

      {/* Upload trigger */}
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={busy || full}
        className="w-full flex items-center justify-center gap-2 py-4 border-2 border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50 active:bg-blue-100 rounded-xl text-sm font-medium text-gray-500 hover:text-blue-600 transition disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {busy ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : full ? (
          <ImagePlus className="w-5 h-5 text-gray-300" />
        ) : (
          <Camera className="w-5 h-5" />
        )}
        <span>
          {busy
            ? (PHASE_LABEL[progress.phase] ?? '...')
            : full
            ? `ครบจำนวนสูงสุดแล้ว (${MAX} รูป)`
            : `เพิ่มรูปภาพ (${mainUrls.length}/${MAX})`}
        </span>
      </button>

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

      {/* Image grid */}
      {mainUrls.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
          {mainUrls.map((url, i) => (
            <div
              key={url}
              className="relative aspect-square rounded-xl overflow-hidden bg-gray-100 group"
            >
              <Image
                src={thumbUrls[i] ?? url}
                alt={`รูปที่ ${i + 1}`}
                fill
                sizes="120px"
                className="object-cover"
              />
              <button
                type="button"
                onClick={() => removeImage(i)}
                className="absolute top-1 right-1 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow transition sm:opacity-0 sm:group-hover:opacity-100 opacity-100"
                aria-label="ลบรูป"
              >
                <X className="w-3.5 h-3.5" />
              </button>
              {i === 0 && (
                <span className="absolute bottom-1 left-1 text-[10px] bg-black/60 text-white px-1.5 py-0.5 rounded-full leading-tight">
                  หลัก
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
