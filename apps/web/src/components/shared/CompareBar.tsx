'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { X, GitCompareArrows, Building2, Maximize, Layers, Train } from 'lucide-react'
import { useCompare } from '@/contexts/compare'
import { formatRoomType } from '@/types'

function fmt(n: number) {
  return new Intl.NumberFormat('th-TH').format(n)
}

export default function CompareBar() {
  const { items, toggle, clear } = useCompare()
  const [open, setOpen] = useState(false)

  if (items.length === 0) return null

  return (
    <>
      {/* Floating bar */}
      <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 lg:bottom-6">
        <div className="flex items-center gap-3 bg-gray-900 text-white px-4 py-2.5 rounded-2xl shadow-2xl border border-white/10">
          <GitCompareArrows className="w-4 h-4 text-blue-400 flex-shrink-0" />
          <span className="text-sm font-medium">เปรียบเทียบ {items.length}/3 รายการ</span>
          {items.length >= 2 && (
            <button
              onClick={() => setOpen(true)}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl transition"
            >
              เปรียบเทียบ
            </button>
          )}
          <button onClick={clear} className="text-gray-400 hover:text-white transition ml-1">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Modal */}
      {open && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div className="fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-3xl shadow-2xl max-h-[90dvh] overflow-y-auto lg:inset-auto lg:top-1/2 lg:left-1/2 lg:-translate-x-1/2 lg:-translate-y-1/2 lg:w-full lg:max-w-4xl lg:rounded-2xl lg:max-h-[85vh]">
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1 lg:hidden">
              <div className="w-10 h-1 bg-gray-200 rounded-full" />
            </div>
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <GitCompareArrows className="w-4 h-4 text-blue-600" />
                <h2 className="text-sm font-bold text-gray-900">เปรียบเทียบทรัพย์</h2>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <td className="w-28 p-3 text-xs text-gray-400 font-medium align-bottom">รายละเอียด</td>
                    {items.map(s => (
                      <td key={s.id} className="p-3 align-top min-w-[180px]">
                        <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-gray-100 mb-2">
                          {(s.photo_thumb_urls?.[0] ?? s.photo_urls?.[0]) ? (
                            <Image
                              src={s.photo_thumb_urls?.[0] ?? s.photo_urls?.[0]!}
                              alt={s.project_name ?? ''}
                              fill
                              className="object-cover"
                              sizes="200px"
                            />
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <Building2 className="w-8 h-8 text-gray-300" />
                            </div>
                          )}
                        </div>
                        <p className="text-xs font-semibold text-gray-900 leading-snug line-clamp-2">
                          {s.project_name ?? 'ไม่ระบุโครงการ'}
                        </p>
                        <div className="flex items-center gap-1 mt-1">
                          <button
                            onClick={() => toggle(s)}
                            className="text-[10px] text-gray-400 hover:text-red-500 transition"
                          >
                            ✕ นำออก
                          </button>
                          <span className="text-gray-200">·</span>
                          <Link
                            href={`/listing/${s.id}`}
                            onClick={() => setOpen(false)}
                            className="text-[10px] text-blue-600 hover:underline"
                          >
                            ดูรายละเอียด →
                          </Link>
                        </div>
                      </td>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  <CompareRow label="ราคา">
                    {items.map(s => (
                      <td key={s.id} className="p-3">
                        {s.listing_type === 'both' ? (
                          <div className="space-y-0.5">
                            {s.rent_price && <p className="font-bold text-gray-900">฿{fmt(s.rent_price)}<span className="text-xs font-normal text-gray-400">/เดือน</span></p>}
                            {s.sale_price && <p className="font-bold text-gray-900">฿{fmt(s.sale_price)}</p>}
                          </div>
                        ) : s.listing_type === 'sale' ? (
                          <p className="font-bold text-gray-900">{s.sale_price ? `฿${fmt(s.sale_price)}` : '—'}</p>
                        ) : (
                          <p className="font-bold text-gray-900">{s.rent_price ? `฿${fmt(s.rent_price)}/เดือน` : '—'}</p>
                        )}
                      </td>
                    ))}
                  </CompareRow>
                  <CompareRow label="ประเภทห้อง">
                    {items.map(s => <td key={s.id} className="p-3 text-gray-700">{s.room_type ? formatRoomType(s.room_type) : '—'}</td>)}
                  </CompareRow>
                  <CompareRow label="ขนาด">
                    {items.map(s => (
                      <td key={s.id} className="p-3 text-gray-700">
                        {s.size_sqm ? <span className="flex items-center gap-1"><Maximize className="w-3 h-3" />{s.size_sqm} ตร.ม.</span> : '—'}
                      </td>
                    ))}
                  </CompareRow>
                  <CompareRow label="ชั้น">
                    {items.map(s => (
                      <td key={s.id} className="p-3 text-gray-700">
                        {s.floor ? <span className="flex items-center gap-1"><Layers className="w-3 h-3" />ชั้น {s.floor}</span> : '—'}
                      </td>
                    ))}
                  </CompareRow>
                  <CompareRow label="ที่ตั้ง">
                    {items.map(s => (
                      <td key={s.id} className="p-3 text-gray-700">
                        {[s.project?.district, s.project?.province].filter(Boolean).join(', ') || '—'}
                      </td>
                    ))}
                  </CompareRow>
                  <CompareRow label="BTS/MRT">
                    {items.map(s => (
                      <td key={s.id} className="p-3">
                        {(s.project?.bts_mrt ?? []).length > 0 ? (
                          <div className="space-y-0.5">
                            {s.project!.bts_mrt!.slice(0, 3).map(st => (
                              <p key={st} className="flex items-center gap-1 text-blue-600 text-xs">
                                <Train className="w-3 h-3" />{st}
                              </p>
                            ))}
                          </div>
                        ) : <span className="text-gray-400">—</span>}
                      </td>
                    ))}
                  </CompareRow>
                  <CompareRow label="Co-Agent">
                    {items.map(s => (
                      <td key={s.id} className="p-3">
                        {s.co_agent_accepted
                          ? <span className="text-xs bg-teal-50 text-teal-700 px-2 py-0.5 rounded-full">รองรับ</span>
                          : <span className="text-gray-400">—</span>}
                      </td>
                    ))}
                  </CompareRow>
                  <CompareRow label="ประกาศ">
                    {items.map(s => (
                      <td key={s.id} className="p-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          s.listing_type === 'rent' ? 'bg-blue-50 text-blue-700'
                          : s.listing_type === 'sale' ? 'bg-green-50 text-green-700'
                          : 'bg-purple-50 text-purple-700'
                        }`}>
                          {s.listing_type === 'rent' ? 'เช่า' : s.listing_type === 'sale' ? 'ขาย' : 'เช่า & ขาย'}
                        </span>
                      </td>
                    ))}
                  </CompareRow>
                </tbody>
              </table>
            </div>

            <div className="px-5 py-4 border-t border-gray-100 flex justify-between items-center">
              <button onClick={clear} className="text-sm text-gray-400 hover:text-red-500 transition">
                ล้างทั้งหมด
              </button>
              <button
                onClick={() => setOpen(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-200 transition"
              >
                ปิด
              </button>
            </div>
          </div>
        </>
      )}
    </>
  )
}

function CompareRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <tr>
      <td className="p-3 text-xs text-gray-500 font-medium align-top whitespace-nowrap bg-gray-50/50">
        {label}
      </td>
      {children}
    </tr>
  )
}
