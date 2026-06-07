import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { ArrowLeft, Building2, Maximize, Layers, Phone, MessageCircle, MapPin, Wind } from 'lucide-react'
import type { Metadata } from 'next'
import { createServiceClient } from '@/lib/supabase/server'
import type { Stock } from '@/types'
import { formatRoomType } from '@/types'
import PublicNav from '@/components/shared/PublicNav'
import PublicFooter from '@/components/shared/PublicFooter'
import PhotoGallery from '@/app/(protected)/stock/[id]/PhotoGallery'
import ContactCard from './ContactCard'
import ShareButtons from './ShareButtons'
import StickyActionBar from './StickyActionBar'
import ProjectSection from './ProjectSection'
import { BannerSidebar } from '@/components/shared/BannerZone'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('stock')
    .select('project_name, room_type, unit_no, listing_type, rent_price, sale_price, size_sqm, project:projects(district, province)')
    .eq('id', id)
    .single()

  if (!data) return { title: 'รายละเอียดทรัพย์ — Proppsy' }

  const d = data as {
    project_name?: string | null; room_type?: string | null; unit_no?: string | null
    listing_type?: string | null; rent_price?: number | null; sale_price?: number | null
    size_sqm?: number | null
    project?: { district?: string | null; province?: string | null } | null
  }
  const fmtN = (n: number) => new Intl.NumberFormat('th-TH').format(n)
  const isRent = d.listing_type !== 'sale'
  const isSale = d.listing_type !== 'rent'
  const nameParts = [d.project_name, d.unit_no].filter(Boolean).join(' · ')
  const priceStr = isRent && d.rent_price
    ? `เช่า ฿${fmtN(d.rent_price)}/เดือน`
    : isSale && d.sale_price
      ? `ขาย ฿${fmtN(d.sale_price)}`
      : null
  const location = [d.project?.district, d.project?.province].filter(Boolean).join(', ')
  const roomLabel = d.room_type ? formatRoomType(d.room_type) : null

  const title = [nameParts || 'ทรัพย์', roomLabel, priceStr].filter(Boolean).join(' · ')
  const description = [
    roomLabel && d.project_name ? `${roomLabel}ใน${d.project_name}` : roomLabel,
    location && `ย่าน${location}`,
    d.size_sqm && `ขนาด ${d.size_sqm} ตร.ม.`,
    priceStr,
  ].filter(Boolean).join(' | ')

  // og:image / twitter:image are handled by the co-located opengraph-image.tsx file
  // which generates a reliable same-domain PNG — no cross-origin URL resolution issues.
  return {
    title,
    description,
    alternates: { canonical: `/listing/${id}` },
    openGraph: {
      title,
      description,
      type: 'website',
      url: `/listing/${id}`,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  }
}

function fmt(n: number) {
  return new Intl.NumberFormat('th-TH').format(n)
}

interface ProjectData {
  name_th: string
  name_en?: string | null
  developer?: string | null
  built_year?: number | null
  total_floors?: number | null
  total_units?: number | null
  parking_pct?: number | null
  facilities: string[]
  bts_mrt: string[]
  address_no?: string | null
  address_road?: string | null
  province?: string | null
  district?: string | null
  subdistrict?: string | null
  zip?: string | null
  map_url?: string | null
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
      project:projects(
        name_th, name_en, developer, built_year,
        total_floors, total_units, parking_pct,
        facilities, bts_mrt,
        address_no, address_road, province, district, subdistrict, zip,
        map_url
      ),
      agent:profiles(name, nickname, email, phone, line_id, logo_url, avatar_url, company_name, team_name, first_name_th, last_name_th, position, public_slug)
    `)
    .eq('id', id)
    .eq('is_published', true)
    .eq('status', 'available')
    .single()

  if (!stockRaw) notFound()

  const stock = stockRaw as unknown as Stock & {
    project?: ProjectData
    agent?: { name?: string; nickname?: string; email?: string; phone?: string; line_id?: string; logo_url?: string; avatar_url?: string; company_name?: string; team_name?: string; first_name_th?: string; last_name_th?: string; position?: string; public_slug?: string }
  }

  const isRent = stock.listing_type !== 'sale'
  const isSale = stock.listing_type !== 'rent'
  const projectName = stock.project?.name_th ?? stock.project_name

  const hasProject = !!stock.project && (
    stock.project.developer ||
    stock.project.built_year ||
    stock.project.total_floors ||
    stock.project.total_units ||
    stock.project.parking_pct ||
    (stock.project.facilities?.length ?? 0) > 0 ||
    (stock.project.bts_mrt?.length ?? 0) > 0 ||
    stock.project.address_road ||
    stock.project.map_url
  )

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

            {/* Room Details */}
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

            {/* Room Facilities */}
            {stock.facilities && stock.facilities.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/70">
                  <h2 className="text-sm font-semibold text-gray-700">สิ่งอำนวยความสะดวกในห้อง</h2>
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

            {/* Project Section */}
            {hasProject && stock.project && (
              <ProjectSection project={stock.project} />
            )}
          </div>

          {/* Right: Contact + sidebar banners */}
          <div className="space-y-4 min-w-0">
            <ContactCard agent={stock.agent ?? null} stockId={stock.id} />
            <BannerSidebar position="listing_sidebar" />
          </div>
        </div>
      </div>

      <PublicFooter />

      {/* JSON-LD structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Apartment',
            name: [projectName, stock.unit_no].filter(Boolean).join(' · ') || 'ทรัพย์',
            url: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://proppsy.vercel.app'}/listing/${stock.id}`,
            image: (stock.photo_urls ?? []).slice(0, 5),
            ...(stock.project && {
              address: {
                '@type': 'PostalAddress',
                streetAddress: stock.project.address_road ?? undefined,
                addressLocality: stock.project.district ?? undefined,
                addressRegion: stock.project.province ?? undefined,
                addressCountry: 'TH',
              },
            }),
            ...(stock.size_sqm && {
              floorSize: { '@type': 'QuantitativeValue', value: stock.size_sqm, unitCode: 'MTK' },
            }),
            ...(stock.floor && { floorLevel: String(stock.floor) }),
            offers: [
              ...(isRent && stock.rent_price != null
                ? [{ '@type': 'Offer', price: stock.rent_price, priceCurrency: 'THB', availability: 'https://schema.org/InStock' }]
                : []),
              ...(isSale && stock.sale_price != null
                ? [{ '@type': 'Offer', price: stock.sale_price, priceCurrency: 'THB', availability: 'https://schema.org/InStock' }]
                : []),
            ],
          }),
        }}
      />

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
