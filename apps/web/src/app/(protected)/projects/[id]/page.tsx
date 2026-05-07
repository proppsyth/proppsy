import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft, Pencil, Building2, MapPin, ExternalLink } from 'lucide-react'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import type { Project } from '@/types'

export const metadata: Metadata = { title: 'รายละเอียดโครงการ' }

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: project }, { data: stocks }] = await Promise.all([
    supabase.from('projects').select('*').eq('id', id).single(),
    supabase
      .from('stock')
      .select('id, unit_no, room_type, status, listing_type, rent_price, sale_price, size_sqm')
      .eq('project_id', id)
      .eq('agent_uid', user.id)
      .order('unit_no'),
  ])

  if (!project) notFound()

  const p = project as unknown as Project

  const address = [p.address_no, p.address_road, p.subdistrict && `แขวง${p.subdistrict}`,
    p.district && `เขต${p.district}`, p.province, p.zip].filter(Boolean).join(' ')

  const stockList = stocks ?? []
  const availableCount = stockList.filter((s: { status: string }) => s.status === 'available').length

  return (
    <div className="p-4 lg:p-8 pt-6 max-w-5xl">
      {/* Header */}
      <div className="mb-5">
        <Link href="/projects" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition mb-3 w-fit">
          <ArrowLeft className="w-4 h-4" />
          กลับรายการโครงการ
        </Link>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-blue-700 flex-shrink-0">
              <Building2 className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-gray-400">{p.id}</p>
              <h1 className="text-xl font-bold text-gray-900 leading-snug">{p.name_th}</h1>
              {p.name_en && <p className="text-sm text-gray-500 mt-0.5">{p.name_en}</p>}
            </div>
          </div>
          <Link
            href={`/projects/${id}/edit`}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition flex-shrink-0"
          >
            <Pencil className="w-3.5 h-3.5" />
            แก้ไข
          </Link>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Left */}
        <div className="lg:col-span-2 space-y-4">
          {/* รายละเอียด */}
          <Section title="รายละเอียดโครงการ">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {p.developer && <InfoItem label="ผู้พัฒนา" value={p.developer} />}
              {p.built_year && <InfoItem label="ปีที่สร้างเสร็จ" value={`พ.ศ. ${p.built_year + 543}`} />}
              {p.total_floors && <InfoItem label="จำนวนชั้น" value={`${p.total_floors} ชั้น`} />}
              {p.total_units && <InfoItem label="จำนวนยูนิต" value={`${p.total_units} ยูนิต`} />}
              {p.parking_pct != null && <InfoItem label="% ที่จอดรถ" value={`${p.parking_pct}%`} />}
            </div>
          </Section>

          {/* ที่ตั้ง */}
          {(address || p.map_url) && (
            <Section title="ที่ตั้ง">
              <div className="space-y-2">
                {address && (
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-gray-700">{address}</p>
                  </div>
                )}
                {p.map_url && (
                  <a
                    href={p.map_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:underline"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    ดูแผนที่ Google Maps
                  </a>
                )}
              </div>
            </Section>
          )}

          {/* BTS/MRT */}
          {p.bts_mrt?.length > 0 && (
            <Section title="BTS / MRT ใกล้เคียง">
              <div className="flex flex-wrap gap-2">
                {p.bts_mrt.map(s => (
                  <span key={s} className="text-xs px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full font-medium">
                    {s}
                  </span>
                ))}
              </div>
            </Section>
          )}

          {/* สิ่งอำนวยความสะดวก */}
          {p.facilities?.length > 0 && (
            <Section title="สิ่งอำนวยความสะดวก">
              <div className="flex flex-wrap gap-2">
                {p.facilities.map(f => (
                  <span key={f} className="text-xs px-2.5 py-1 bg-gray-100 text-gray-700 rounded-full">
                    {f}
                  </span>
                ))}
              </div>
            </Section>
          )}
        </div>

        {/* Right: stocks in this project */}
        <div>
          <Section title={`ทรัพย์ในโครงการ (${stockList.length})`}>
            {stockList.length > 0 ? (
              <div className="space-y-2">
                {availableCount > 0 && (
                  <p className="text-xs text-green-600 font-medium mb-2">ว่าง {availableCount} ยูนิต</p>
                )}
                {stockList.map((s: {
                  id: string
                  unit_no?: string | null
                  room_type?: string | null
                  status: string
                  listing_type: string
                  rent_price?: number | null
                  sale_price?: number | null
                  size_sqm?: number | null
                }) => (
                  <Link
                    key={s.id}
                    href={`/stock/${s.id}`}
                    className="block p-2.5 rounded-lg border border-gray-100 hover:border-blue-200 hover:bg-blue-50/40 transition"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {s.unit_no ?? s.id}
                        {s.room_type && <span className="text-gray-400 font-normal ml-1">{s.room_type}</span>}
                      </p>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                        s.status === 'available' ? 'bg-green-100 text-green-700' :
                        s.status === 'rented' ? 'bg-blue-100 text-blue-700' :
                        s.status === 'sold' ? 'bg-purple-100 text-purple-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {s.status === 'available' ? 'ว่าง' : s.status === 'rented' ? 'เช่าแล้ว' : s.status === 'sold' ? 'ขายแล้ว' : 'ไม่ว่าง'}
                      </span>
                    </div>
                    {(s.rent_price || s.sale_price) && (
                      <p className="text-xs text-blue-600 mt-0.5">
                        {s.listing_type !== 'sale' && s.rent_price
                          ? `฿${new Intl.NumberFormat('th-TH').format(s.rent_price)}/เดือน`
                          : s.sale_price
                          ? `ขาย ฿${new Intl.NumberFormat('th-TH').format(s.sale_price)}`
                          : ''}
                      </p>
                    )}
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <p className="text-sm text-gray-400">ยังไม่มีทรัพย์ในโครงการนี้</p>
              </div>
            )}
          </Section>
        </div>
      </div>
    </div>
  )
}

// ─── Sub-components ──────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50/70">
        <h2 className="text-sm font-semibold text-gray-700">{title}</h2>
      </div>
      <div className="p-4">{children}</div>
    </div>
  )
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-500 mb-0.5">{label}</p>
      <p className="text-sm font-medium text-gray-900">{value}</p>
    </div>
  )
}
