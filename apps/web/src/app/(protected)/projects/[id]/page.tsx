import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft, Pencil, Building2, MapPin, ExternalLink, ShieldCheck, Train, School, ShoppingBag, Heart, Landmark, Store, UtensilsCrossed, Star } from 'lucide-react'
import { stationColorClass, stationDotClass } from '@/lib/transitColors'
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

  const [{ data: project }, { data: stocks }, { data: profile }] = await Promise.all([
    supabase.from('projects').select('*').eq('id', id).single(),
    supabase
      .from('stock')
      .select('id, unit_no, room_type, status, listing_type, rent_price, sale_price, size_sqm')
      .eq('project_id', id)
      .eq('agent_uid', user.id)
      .order('unit_no'),
    supabase.from('profiles').select('role').eq('id', user.id).single(),
  ])

  const isAdmin = profile?.role === 'admin'

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
          {isAdmin ? (
            <Link
              href={`/projects/${id}/edit`}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition flex-shrink-0"
            >
              <Pencil className="w-3.5 h-3.5" />
              แก้ไข
            </Link>
          ) : (
            <div className="flex items-center gap-1.5 text-xs text-gray-400 flex-shrink-0">
              <ShieldCheck className="w-3.5 h-3.5" />
              จัดการโดยแอดมิน
            </div>
          )}
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

          {/* BTS/MRT + distances */}
          {p.bts_mrt?.length > 0 && (
            <Section title="BTS / MRT ใกล้เคียง">
              {(() => {
                // Try to enrich chips with distance data
                const distMap = new Map<string, number>(
                  ((p as unknown as { transit_distances?: { station: string; distance_m: number }[] })
                    .transit_distances ?? []).map(d => [d.station, d.distance_m])
                )
                return (
                  <div className="flex flex-wrap gap-2">
                    {p.bts_mrt.map(s => {
                      const dm = distMap.get(s)
                      return (
                        <span key={s} className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-full font-medium border ${stationColorClass(s)}`}>
                          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${stationDotClass(s)}`} />
                          {s}
                          {dm != null && (
                            <span className="opacity-70 font-normal">
                              {dm >= 1000 ? `${(dm/1000).toFixed(1)}กม.` : `${dm}ม.`}
                            </span>
                          )}
                        </span>
                      )
                    })}
                  </div>
                )
              })()}
            </Section>
          )}

          {/* Transit distances full table */}
          {((p as unknown as { transit_distances?: unknown[] }).transit_distances ?? []).length > 0 && (
            <Section title="ระยะทางสถานีรถไฟฟ้า (ทุกสาย)">
              <div className="space-y-1.5">
                {((p as unknown as { transit_distances?: { station: string; line: string; distance_m: number }[] })
                  .transit_distances ?? []).map((t, i) => (
                  <div key={i} className="flex items-center gap-3 py-1.5 border-b border-gray-50 last:border-0">
                    <Train className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                    <span className="text-sm font-medium text-gray-800 flex-1">{t.station}</span>
                    <span className="text-xs text-gray-400 hidden sm:block">{t.line}</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${stationColorClass(t.station)}`}>
                      {t.distance_m >= 1000
                        ? `${(t.distance_m / 1000).toFixed(1)} กม.`
                        : `${t.distance_m} ม.`}
                    </span>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Nearby amenities */}
          {((p as unknown as { nearby_amenities?: unknown[] }).nearby_amenities ?? []).length > 0 && (
            <Section title="สถานที่สำคัญใกล้เคียง">
              {(() => {
                const catMeta: Record<string, { label: string; Icon: React.ComponentType<{ className?: string }> }> = {
                  education:   { label: 'สถานศึกษา/มหาวิทยาลัย', Icon: School },
                  shopping:    { label: 'ห้าง/ช้อปปิ้ง',          Icon: ShoppingBag },
                  healthcare:  { label: 'โรงพยาบาล',              Icon: Heart },
                  cultural:    { label: 'วัด/ศาสนสถาน',           Icon: Landmark },
                  convenience: { label: 'ร้านสะดวกซื้อ',          Icon: Store },
                  restaurant:  { label: 'ร้านอาหารชื่อดัง',       Icon: UtensilsCrossed },
                  landmark:    { label: 'สถานที่ดังๆ อื่นๆ',      Icon: Star },
                }
                const grouped = new Map<string, { name: string; distance_m: number }[]>()
                for (const a of (p as unknown as { nearby_amenities?: { name: string; category: string; distance_m: number }[] }).nearby_amenities ?? []) {
                  const arr = grouped.get(a.category) ?? []
                  arr.push({ name: a.name, distance_m: a.distance_m })
                  grouped.set(a.category, arr)
                }
                return (
                  <div className="space-y-3">
                    {[...grouped.entries()].map(([cat, items]) => {
                      const meta = catMeta[cat] ?? { label: cat, Icon: MapPin }
                      const CatIcon = meta.Icon
                      return (
                        <div key={cat}>
                          <div className="flex items-center gap-1.5 mb-1.5">
                            <CatIcon className="w-3.5 h-3.5 text-gray-400" />
                            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{meta.label}</span>
                          </div>
                          <div className="space-y-1">
                            {items.map((a, i) => (
                              <div key={i} className="flex items-center justify-between text-sm py-1 pl-5 border-b border-gray-50 last:border-0">
                                <span className="text-gray-800">{a.name}</span>
                                <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                                  {a.distance_m >= 1000
                                    ? `${(a.distance_m/1000).toFixed(1)} กม.`
                                    : `${a.distance_m} ม.`}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )
              })()}
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
