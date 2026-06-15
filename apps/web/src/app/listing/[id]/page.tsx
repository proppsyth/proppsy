import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { cache } from 'react'
import { ArrowLeft, Building2, Maximize, Layers, MapPin, Wind, Eye, Users } from 'lucide-react'
import type { Metadata } from 'next'
import { createServiceClient } from '@/lib/supabase/server'
import type { Stock } from '@/types'
import { formatRoomType } from '@/types'
import { buildListingSlug, extractListingId } from '@/lib/listingSlug'
import PublicNav from '@/components/shared/PublicNav'
import PublicFooter from '@/components/shared/PublicFooter'
import PhotoGallery from '@/app/(protected)/stock/[id]/PhotoGallery'
import ContactCard from './ContactCard'
import ShareButtons from './ShareButtons'
import StickyActionBar from './StickyActionBar'
import ViewTracker from './ViewTracker'
import ProjectSection from './ProjectSection'
import RecentlyViewed from './RecentlyViewed'
import SaveButton from '@/components/shared/SaveButton'
import { BannerSidebar } from '@/components/shared/BannerZone'

// Deduplicate the stock fetch across generateMetadata + page component —
// React.cache() ensures only one Supabase round-trip per request, not two.
const getStock = cache(async (id: string) => {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('stock')
    .select(`
      *, published_at,
      project:projects(
        name_th, name_en, developer, built_year,
        total_floors, total_units, parking_pct,
        facilities, bts_mrt,
        transit_distances, nearby_amenities,
        address_no, address_road, province, district, subdistrict, zip,
        map_url
      ),
      agent:profiles(name, nickname, email, phone, line_id, logo_url, avatar_url, company_name, team_name, first_name_th, last_name_th, position, public_slug)
    `)
    .eq('id', id)
    .eq('is_published', true)
    .eq('status', 'available')
    .single()
  return data
})

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id: rawSlug } = await params
  const id = extractListingId(rawSlug)
  const data = await getStock(id)

  if (!data) return { title: 'รายละเอียดทรัพย์ — Proppsy' }

  const d = data as {
    project_name?: string | null; room_type?: string | null; unit_no?: string | null
    listing_type?: string | null; rent_price?: number | null; sale_price?: number | null
    size_sqm?: number | null; photo_urls?: string[] | null
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
    'ดูรายละเอียดและติดต่อเอเจนต์ได้ที่ Proppsy',
  ].filter(Boolean).join(' | ')

  const canonicalSlug = buildListingSlug({ id, room_type: d.room_type, listing_type: d.listing_type, project_name: d.project_name })
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://proppsy.vercel.app'
  // Use actual property photo as OG image — LINE/FB/Twitter crawlers use absolute URLs
  const ogImageUrl = d.photo_urls?.[0]
    ? d.photo_urls[0]
    : `${siteUrl}/listing/${canonicalSlug}/opengraph-image`

  return {
    title,
    description,
    alternates: { canonical: `/listing/${canonicalSlug}` },
    openGraph: {
      title,
      description,
      type: 'website',
      url: `/listing/${canonicalSlug}`,
      images: [{ url: ogImageUrl, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImageUrl],
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
  transit_distances?: { station: string; line: string; distance_m: number }[] | null
  nearby_amenities?: { name: string; category: string; distance_m: number }[] | null
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
  const { id: rawSlug } = await params
  // Support both legacy /listing/STK-0006 and SEO /listing/for-rent-studio-stk-0006
  const id = extractListingId(rawSlug)

  // getStock() is React.cache() — result is shared with generateMetadata (no extra round-trip)
  const stockRaw = await getStock(id)
  if (!stockRaw) notFound()

  const stock = stockRaw as unknown as Stock & {
    view_count?: number
    co_agent_accepted?: boolean
    project?: ProjectData
    agent?: { name?: string; nickname?: string; email?: string; phone?: string; line_id?: string; logo_url?: string; avatar_url?: string; company_name?: string; team_name?: string; first_name_th?: string; last_name_th?: string; position?: string; public_slug?: string }
  }

  const isRent = stock.listing_type !== 'sale'
  const isSale = stock.listing_type !== 'rent'
  const projectName = stock.project?.name_th ?? stock.project_name
  const canonicalSlug = buildListingSlug({ id: stock.id, room_type: stock.room_type, listing_type: stock.listing_type, project_name: stock.project_name })

  const supabase = createServiceClient()
  // Sibling units in same project
  const siblingRes = stock.project_id
    ? await supabase
      .from('stock')
      .select('id, unit_no, room_type, rent_price, sale_price, listing_type, photo_thumb_urls, photo_urls')
      .eq('project_id', stock.project_id)
      .eq('is_published', true)
      .eq('status', 'available')
      .neq('id', id)
      .limit(6)
    : null
  const siblingUnits = (siblingRes?.data ?? []) as Array<{
    id: string; unit_no?: string; room_type?: string
    rent_price?: number; sale_price?: number; listing_type?: string
    photo_thumb_urls?: string[]; photo_urls?: string[]
  }>

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
      <ViewTracker stockId={stock.id} />
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
                {stock.co_agent_accepted && (
                  <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-teal-50 text-teal-700 flex items-center gap-1">
                    <Users className="w-3 h-3" />Co-Agent Welcome
                  </span>
                )}
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

              {/* View count + published date + Share */}
              <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
                <div className="flex items-center gap-3 flex-wrap text-xs text-gray-400">
                  {(stock.view_count ?? 0) > 0 && (
                    <span className="flex items-center gap-1">
                      <Eye className="w-3.5 h-3.5" />
                      {(stock.view_count ?? 0).toLocaleString('th-TH')} ครั้งที่เข้าชม
                    </span>
                  )}
                  {(stock as unknown as { published_at?: string | null }).published_at && (
                    <span>
                      เผยแพร่{' '}
                      {new Date((stock as unknown as { published_at: string }).published_at).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <p className="text-xs text-gray-400">แชร์ประกาศนี้</p>
                  <SaveButton stockId={stock.id} />
                </div>
                <ShareButtons
                  path={`/listing/${canonicalSlug}`}
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
                {stock.co_agent_accepted && (
                  <div className="col-span-2 flex items-center gap-1.5 text-sm text-teal-700 bg-teal-50 rounded-xl px-3 py-2">
                    <Users className="w-4 h-4 flex-shrink-0" />
                    <span className="font-medium">รับ Co-Agent</span>
                    <span className="text-xs text-teal-600">— เอเจนต์ยินดีร่วมงานกับเอเจนต์อื่น</span>
                  </div>
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

          {/* Right: Contact + sidebar banners + sibling units */}
          <div className="space-y-4 min-w-0 lg:sticky lg:top-24 lg:self-start lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto lg:pb-4 scrollbar-none">
            <ContactCard agent={stock.agent ?? null} stockId={stock.id} />
            <BannerSidebar position="listing_sidebar" />
            {siblingUnits.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/70">
                  <h2 className="text-sm font-semibold text-gray-700">ยูนิตอื่นในโครงการนี้</h2>
                </div>
                <div className="divide-y divide-gray-100">
                  {siblingUnits.map(u => {
                    const photo = u.photo_thumb_urls?.[0] ?? u.photo_urls?.[0]
                    const price = u.listing_type === 'sale' ? u.sale_price : u.rent_price
                    return (
                      <Link key={u.id} href={`/listing/${u.id}`}
                        className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition">
                        {photo ? (
                          <div className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
                            <Image src={photo} alt="" fill sizes="48px" className="object-cover" />
                          </div>
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                            <Building2 className="w-5 h-5 text-gray-300" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">{u.unit_no ? `ยูนิต ${u.unit_no}` : u.id}</p>
                          {u.room_type && <p className="text-xs text-gray-500">{formatRoomType(u.room_type)}</p>}
                        </div>
                        {price != null && (
                          <p className="text-sm font-semibold text-gray-900 flex-shrink-0">
                            ฿{fmt(price)}
                            {u.listing_type !== 'sale' && <span className="text-xs font-normal text-gray-400">/เดือน</span>}
                          </p>
                        )}
                      </Link>
                    )
                  })}
                </div>
              </div>
            )}
            <RecentlyViewed current={{
              id: stock.id,
              project_name: projectName ?? stock.project_name ?? undefined,
              unit_no: stock.unit_no ?? undefined,
              room_type: stock.room_type ?? undefined,
              rent_price: stock.rent_price,
              sale_price: stock.sale_price,
              listing_type: stock.listing_type ?? undefined,
              photo_thumb_url: stock.photo_thumb_urls?.[0] ?? stock.photo_urls?.[0] ?? undefined,
            }} />
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
            url: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://proppsy.vercel.app'}/listing/${canonicalSlug}`,
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
