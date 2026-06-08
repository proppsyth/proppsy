'use client'

import { useRef, useState } from 'react'
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
  reorderImages,
  label,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [fileDragOver, setFileDragOver] = useState(false)
  const [dragFromIdx, setDragFromIdx] = useState<number | null>(null)
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null)

  const busy = progress.phase === 'processing' || progress.phase === 'uploading'
  const full = mainUrls.length >= MAX

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (files.length) await addImages(files)
    e.target.value = ''
  }

  // ── File drag-drop onto upload zone ──────────────────────────
  function handleFileDragOver(e: React.DragEvent) {
    if (e.dataTransfer.types.includes('Files')) {
      e.preventDefault()
      setFileDragOver(true)
    }
  }
  function handleFileDragLeave(e: React.DragEvent) {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setFileDragOver(false)
    }
  }
  async function handleFileDrop(e: React.DragEvent) {
    e.preventDefault()
    setFileDragOver(false)
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'))
    if (files.length && !busy && !full) await addImages(files)
  }

  // ── Image tile drag-to-reorder ────────────────────────────────
  function handleTileDragStart(e: React.DragEvent, idx: number) {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(idx))
    setDragFromIdx(idx)
  }
  function handleTileDragOver(e: React.DragEvent, idx: number) {
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = 'move'
    if (dragOverIdx !== idx) setDragOverIdx(idx)
  }
  function handleTileDrop(e: React.DragEvent, toIdx: number) {
    e.preventDefault()
    e.stopPropagation()
    if (dragFromIdx !== null && dragFromIdx !== toIdx) {
      reorderImages(dragFromIdx, toIdx)
    }
    setDragFromIdx(null)
    setDragOverIdx(null)
  }
  function handleTileDragEnd() {
    setDragFromIdx(null)
    setDragOverIdx(null)
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

      {/* Upload trigger / dropzone */}
      <div
        onDragOver={handleFileDragOver}
        onDragLeave={handleFileDragLeave}
        onDrop={handleFileDrop}
        className={`rounded-xl transition-all ${fileDragOver ? 'ring-2 ring-blue-400 ring-offset-1' : ''}`}
      >
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={busy || full}
          className={`w-full flex items-center justify-center gap-2 py-4 border-2 border-dashed rounded-xl text-sm font-medium transition disabled:opacity-40 disabled:cursor-not-allowed ${
            fileDragOver
              ? 'border-blue-400 bg-blue-50 text-blue-600'
              : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50 active:bg-blue-100 text-gray-500 hover:text-blue-600'
          }`}
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
              : fileDragOver
              ? 'วางรูปที่นี่'
              : `เพิ่มรูปภาพ (${mainUrls.length}/${MAX})`}
          </span>
        </button>
      </div>

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

      {/* Image grid with drag-to-reorder */}
      {mainUrls.length > 0 && (
        <>
          <p className="text-[11px] text-gray-400 hidden sm:block">ลากรูปเพื่อเรียงลำดับ · รูปแรก = ภาพปกหลัก</p>
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
            {mainUrls.map((url, i) => (
              <div
                key={url}
                draggable
                onDragStart={e => handleTileDragStart(e, i)}
                onDragOver={e => handleTileDragOver(e, i)}
                onDrop={e => handleTileDrop(e, i)}
                onDragEnd={handleTileDragEnd}
                className={`relative aspect-square rounded-xl overflow-hidden bg-gray-100 group cursor-grab active:cursor-grabbing select-none transition-opacity ${
                  dragFromIdx === i
                    ? 'opacity-40'
                    : dragOverIdx === i && dragFromIdx !== null
                    ? 'ring-2 ring-blue-400 ring-offset-1'
                    : ''
                }`}
              >
                <Image
                  src={thumbUrls[i] ?? url}
                  alt={`รูปที่ ${i + 1}`}
                  fill
                  sizes="120px"
                  className="object-cover pointer-events-none"
                  draggable={false}
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
                  <span className="absolute bottom-1 left-1 text-[10px] bg-black/60 text-white px-1.5 py-0.5 rounded-full leading-tight pointer-events-none">
                    หลัก
                  </span>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
