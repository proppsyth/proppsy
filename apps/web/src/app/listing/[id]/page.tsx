import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { ArrowLeft, Building2, Maximize, Layers, Phone, MessageCircle, MapPin, Wind } from 'lucide-react'
import type { Metadata } from 'next'
import { createServiceClient } from '@/lib/supabase/server'
import type { Stock } from '@/types'
import { formatRoomType } from '@/types'
import PublicNav from '@/components/shared/PublicNav'
import PhotoGallery from '@/app/(protected)/stock/[id]/PhotoGallery'
import ContactCard from './ContactCard'
import ShareButtons from './ShareButtons'
import StickyActionBar from './StickyActionBar'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('stock')
    .select('project_name, room_type, unit_no')
    .eq('id', id)
    .single()
  const title = [data?.project_name, data?.room_type, data?.unit_no].filter(Boolean).join(' · ')
  return { title: title ? `${title} — Proppsy` : 'รายละเอียดทรัพย์ — Proppsy' }
}

function fmt(n: number) {
  return new Intl.NumberFormat('th-TH').format(n)
}

export default async function PublicPropertyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  // Use service client so unauthenticated visitors can read published listings (bypasses RLS)
  const supabase = createServiceClient()

  const { data: stockRaw } = await supabase
    .from('stock')
    .select(`
      *,
      project:projects(name_th, name_en, developer, built_year, total_floors, facilities, bts_mrt, address_road, province, district),
      agent:profiles(name, nickname, email, phone, line_id, logo_url, company_name, team_name, first_name_th, last_name_th, position)
    `)
    .eq('id', id)
    .eq('is_published', true)
    .eq('status', 'available')
    .single()

  if (!stockRaw) notFound()

  const stock = stockRaw as unknown as Stock & {
    project?: { name_th: string; name_en?: string; developer?: string; built_year?: number; total_floors?: number; facilities: string[]; bts_mrt: string[]; address_road?: string; province?: string; district?: string }
    agent?: { name?: string; nickname?: string; email?: string; phone?: string; line_id?: string; logo_url?: string; company_name?: string; team_name?: string; first_name_th?: string; last_name_th?: string; position?: string }
  }

  const isRent = stock.listing_type !== 'sale'
  const isSale = stock.listing_type !== 'rent'
  const projectName = stock.project?.name_th ?? stock.project_name

  return (
    <div className="min-h-screen bg-gray-50 overflow-x-hidden">
      <PublicNav />

      <div className="max-w-6xl mx-auto px-4 py-6 pb-28">
        <Link href="/" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition mb-5 w-fit">
          <ArrowLeft className="w-4 h-4" />
          กลับรายการทรัพย์สิน
        </Link>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left: Gallery + details */}
          <div className="lg:col-span-2 space-y-5 min-w-0">
            {/* Gallery */}
            <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm p-4">
              <PhotoGallery urls={stock.photo_urls ?? []} />
            </div>

            {/* Header */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-start gap-2 flex-wrap mb-3">
                {isRent && <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-blue-100 text-blue-700">เช่า</span>}
                {isSale && stock.listing_type !== 'rent' && <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-green-100 text-green-700">ขาย</span>}
                {stock.room_type && <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-gray-100 text-gray-600">{formatRoomType(stock.room_type)}</span>}
                {stock.is_premium && (
                  <span
                    className="text-xs px-2.5 py-1 rounded-full font-bold text-white animate-hot-glow"
                    style={{ background: 'linear-gradient(135deg, #f97316 0%, #ef4444 100%)' }}
                  >
                    HOT
                  </span>
                )}
              </div>

              <h1 className="text-xl font-bold text-gray-900 break-words">
                {[projectName, stock.unit_no].filter(Boolean).join(' · ') || 'ทรัพย์ไม่ระบุ'}
              </h1>

              {stock.project?.address_road && (
                <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                  <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="break-words">{[stock.project.address_road, stock.project.district, stock.project.province].filter(Boolean).join(', ')}</span>
                </p>
              )}

              {/* Price */}
              <div className="mt-4 flex flex-wrap gap-4">
                {isRent && stock.rent_price != null && (
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">ราคาเช่า / เดือน</p>
                    <p className="text-2xl font-bold text-blue-700">฿{fmt(stock.rent_price)}</p>
                  </div>
                )}
                {isSale && stock.sale_price != null && (
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">ราคาขาย</p>
                    <p className="text-2xl font-bold text-green-700">฿{fmt(stock.sale_price)}</p>
                  </div>
                )}
              </div>

              {/* Share */}
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-xs text-gray-400 mb-2">แชร์ประกาศนี้</p>
                <ShareButtons
                  path={`/listing/${stock.id}`}
                  title={[projectName, stock.unit_no].filter(Boolean).join(' · ') || 'ทรัพย์'}
                />
              </div>
            </div>

            {/* Details */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/70">
                <h2 className="text-sm font-semibold text-gray-700">รายละเอียดห้อง</h2>
              </div>
              <div className="p-5 grid grid-cols-2 gap-4">
                {stock.size_sqm && (
                  <DetailItem icon={<Maximize className="w-4 h-4" />} label="ขนาด" value={`${stock.size_sqm} ตร.ม.`} />
                )}
                {stock.floor && (
                  <DetailItem icon={<Layers className="w-4 h-4" />} label="ชั้น" value={`${stock.floor}`} />
                )}
                {stock.building && (
                  <DetailItem icon={<Building2 className="w-4 h-4" />} label="อาคาร" value={stock.building} />
                )}
                {stock.view_direction && (
                  <DetailItem icon={<Wind className="w-4 h-4" />} label="ทิศ" value={stock.view_direction} />
                )}
                {stock.deposit != null && stock.deposit > 0 && (
                  <DetailItem icon={null} label="มัดจำ" value={`${stock.deposit} เดือน`} />
                )}
                {stock.contract_term != null && stock.contract_term > 0 && (
                  <DetailItem icon={null} label="สัญญาขั้นต่ำ" value={`${stock.contract_term} เดือน`} />
                )}
              </div>
            </div>

            {/* Furniture */}
            {stock.furniture && stock.furniture.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/70">
                  <h2 className="text-sm font-semibold text-gray-700">เฟอร์นิเจอร์</h2>
                </div>
                <div className="p-5 flex flex-wrap gap-2">
                  {stock.furniture.map(item => (
                    <span key={item} className="text-xs px-3 py-1.5 bg-amber-50 text-amber-700 rounded-full border border-amber-100">
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Facilities */}
            {stock.facilities && stock.facilities.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/70">
                  <h2 className="text-sm font-semibold text-gray-700">สิ่งอำนวยความสะดวก</h2>
                </div>
                <div className="p-5 flex flex-wrap gap-2">
                  {stock.facilities.map(f => (
                    <span key={f} className="text-xs px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full border border-blue-100">
                      {f}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Project BTS/MRT */}
            {stock.project?.bts_mrt && stock.project.bts_mrt.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/70">
                  <h2 className="text-sm font-semibold text-gray-700">BTS / MRT ใกล้เคียง</h2>
                </div>
                <div className="p-5 flex flex-wrap gap-2">
                  {stock.project.bts_mrt.map(s => (
                    <span key={s} className="text-xs px-3 py-1.5 bg-green-50 text-green-700 rounded-full border border-green-100">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right: Contact */}
          <div className="space-y-4 min-w-0">
            <ContactCard agent={stock.agent ?? null} stockId={stock.id} />

            {/* Project info */}
            {stock.project && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/70">
                  <h2 className="text-sm font-semibold text-gray-700">ข้อมูลโครงการ</h2>
                </div>
                <div className="p-4 space-y-2 text-sm">
                  <p className="font-medium text-gray-900 break-words">{stock.project.name_th}</p>
                  {stock.project.name_en && <p className="text-xs text-gray-400">{stock.project.name_en}</p>}
                  {stock.project.developer && (
                    <p className="text-xs text-gray-500">ผู้พัฒนา: {stock.project.developer}</p>
                  )}
                  {stock.project.built_year && (
                    <p className="text-xs text-gray-500">ปีที่สร้าง: {stock.project.built_year}</p>
                  )}
                  {stock.project.total_floors && (
                    <p className="text-xs text-gray-500">จำนวนชั้น: {stock.project.total_floors} ชั้น</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-100 mt-12 py-8 text-center text-xs text-gray-400">
        © {new Date().getFullYear()} Proppsy · Real Estate Management Platform
      </footer>

      {/* Sticky bottom inquiry bar */}
      <StickyActionBar
        agent={stock.agent ?? null}
        stockId={stock.id}
        agentUid={stock.agent_uid}
        projectName={projectName}
        unitNo={stock.unit_no}
        rentPrice={stock.rent_price}
        salePrice={stock.sale_price}
        listingType={stock.listing_type}
      />
    </div>
  )
}

function DetailItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="flex flex-col gap-1 min-w-0">
      <span className="text-xs text-gray-400 flex items-center gap-1">
        {icon}
        {label}
      </span>
      <span className="text-sm font-semibold text-gray-800 break-words">{value}</span>
    </div>
  )
}
