'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Loader2, CheckCircle2, XCircle, ImagePlus, Trash2 } from 'lucide-react'
import { useDocumentUpload } from '@/hooks/useUpload'
import { saveCardSettings, type CardSettings } from './actions'

export default function LineCardSettings({ settings }: { settings: CardSettings }) {
  const router = useRouter()
  const [brand, setBrand] = useState(settings.brandName ?? '')
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [isPending, startTransition] = useTransition()

  const { url, progress, upload, clear } = useDocumentUpload({
    category: 'line-cards',
    initialUrl: settings.imageUrl ?? undefined,
  })
  const uploading = progress.phase === 'processing' || progress.phase === 'uploading'

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setMsg(null)
    await upload(file)
  }

  function handleSave() {
    setMsg(null)
    startTransition(async () => {
      const res = await saveCardSettings({ brandName: brand, imageUrl: url || null })
      if (res.error) setMsg({ ok: false, text: res.error })
      else { setMsg({ ok: true, text: 'บันทึกแล้ว ✓' }); router.refresh() }
    })
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-3">
      <div>
        <p className="text-sm font-semibold text-gray-800">ปรับแต่งการ์ดแจ้งเตือน</p>
        <p className="text-xs text-gray-500">ชื่อแบรนด์และรูปนี้จะแสดงบนการ์ดทุกใบที่ส่งเข้ากลุ่ม</p>
      </div>

      <div>
        <label className="block text-xs text-gray-500 mb-1 font-medium">ชื่อที่แสดงบนการ์ด</label>
        <input
          value={brand}
          onChange={e => setBrand(e.target.value)}
          placeholder={settings.defaultBrandName || 'เช่น ชื่อเอเจนต์ / บริษัท'}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {settings.defaultBrandName && !brand && (
          <button type="button" onClick={() => setBrand(settings.defaultBrandName)}
            className="mt-1 text-xs text-blue-600 hover:underline">
            ใช้ &ldquo;{settings.defaultBrandName}&rdquo;
          </button>
        )}
      </div>

      <div>
        <label className="block text-xs text-gray-500 mb-1 font-medium">รูปหัวการ์ด (โลโก้/แบนเนอร์)</label>
        {url ? (
          <div className="relative w-full max-w-xs aspect-[20/9] rounded-lg overflow-hidden border border-gray-200">
            <Image src={url} alt="card" fill className="object-cover" sizes="320px" />
            <button type="button" onClick={clear}
              className="absolute top-1.5 right-1.5 bg-white/90 rounded-full p-1 text-red-600 hover:bg-white shadow">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <label className="flex items-center gap-2 w-fit px-3 py-2 border border-dashed border-gray-300 rounded-lg text-sm text-gray-500 cursor-pointer hover:border-blue-400 hover:text-blue-600 transition">
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
            {uploading ? `กำลังอัปโหลด ${progress.percent}%` : 'เลือกรูป'}
            <input type="file" accept="image/*" className="hidden" onChange={handleFile} disabled={uploading} />
          </label>
        )}
        {progress.phase === 'error' && (
          <p className="mt-1 text-xs text-red-600">{progress.error ?? 'อัปโหลดไม่สำเร็จ'}</p>
        )}
        <p className="mt-1 text-xs text-gray-400">แนะนำสัดส่วนแนวนอน ~20:9</p>
      </div>

      {msg && (
        <div className={`flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg ${msg.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {msg.ok ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
          {msg.text}
        </div>
      )}

      <button onClick={handleSave} disabled={isPending || uploading}
        className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition disabled:opacity-40">
        {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
        บันทึกการ์ด
      </button>
    </div>
  )
}
