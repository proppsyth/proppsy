'use client'

import { useRef, useTransition, useState } from 'react'
import { Camera, Plus, Trash2, Loader2, Home, Check } from 'lucide-react'
import { usePropertyImages } from '@/hooks/useUpload'
import { updateStockPhotos } from '../actions'

interface Props {
  stockId: string
  initialMainUrls: string[]
  initialThumbUrls: string[]
}

export default function ContractStockPhotos({ stockId, initialMainUrls, initialThumbUrls }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [isSaving, startSave] = useTransition()
  const [saved, setSaved] = useState(false)

  const { mainUrls, thumbUrls, progress, addImages, removeImage } = usePropertyImages({
    stockId,
    initialMainUrls,
    initialThumbUrls,
  })

  const isUploading = progress.phase === 'processing' || progress.phase === 'uploading'

  function handleSave(urls: string[], thumbs: string[]) {
    startSave(async () => {
      const res = await updateStockPhotos(stockId, urls, thumbs)
      if (!res.error) {
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
      }
    })
  }

  function handleRemove(i: number) {
    const newMain = mainUrls.filter((_, idx) => idx !== i)
    const newThumb = thumbUrls.filter((_, idx) => idx !== i)
    removeImage(i)
    handleSave(newMain, newThumb)
  }

  return (
    <div>
      {mainUrls.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-gray-300 border border-dashed border-gray-200 rounded-xl">
          <Home className="w-10 h-10 mb-2" />
          <p className="text-sm text-gray-400">ยังไม่มีรูปทรัพย์สิน</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-3">
          {mainUrls.map((url, i) => (
            <div key={url} className="relative aspect-square rounded-lg overflow-hidden bg-gray-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={thumbUrls[i] ?? url} alt={`รูปที่ ${i + 1}`} className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => handleRemove(i)}
                className="absolute top-1 right-1 w-6 h-6 bg-black/60 hover:bg-red-600 text-white rounded-full flex items-center justify-center transition"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2 mt-2 flex-wrap">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={e => {
            const files = e.target.files
            if (!files) return
            void addImages(Array.from(files))
            e.target.value = ''
          }}
        />

        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={isUploading || isSaving}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs rounded-lg transition disabled:opacity-50"
        >
          {isUploading ? (
            <><Loader2 className="w-3.5 h-3.5 animate-spin" />กำลังอัปโหลด {progress.percent}%</>
          ) : (
            <><Plus className="w-3.5 h-3.5" />เพิ่มรูป</>
          )}
        </button>

        {!isUploading && (
          <button
            type="button"
            onClick={() => handleSave(mainUrls, thumbUrls)}
            disabled={isSaving}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-lg transition disabled:opacity-50"
          >
            {isSaving ? (
              <><Loader2 className="w-3.5 h-3.5 animate-spin" />กำลังบันทึก...</>
            ) : saved ? (
              <><Check className="w-3.5 h-3.5" />บันทึกแล้ว ✓</>
            ) : (
              <><Camera className="w-3.5 h-3.5" />บันทึกรูป</>
            )}
          </button>
        )}

        {progress.error && <p className="text-xs text-red-500">{progress.error}</p>}
      </div>

      {!isUploading && mainUrls.length === 0 && (
        <p className="text-xs text-gray-400 mt-1.5">เพิ่มรูปแล้วกด "บันทึกรูป" เพื่ออัปเดตทรัพย์สิน</p>
      )}
    </div>
  )
}
