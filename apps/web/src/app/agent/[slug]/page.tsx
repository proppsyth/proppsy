import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Building2, MapPin, Maximize, Layers, Phone, MessageCircle, Calendar } from 'lucide-react'
import type { Metadata } from 'next'
import { createServiceClient } from '@/lib/supabase/server'
import type { Stock } from '@/types'
import PublicNav from '@/components/shared/PublicNav'
import AgentAvatar from '@/components/shared/AgentAvatar'
import StorageImage from '@/components/shared/StorageImage'

// ── Types ─────────────────────────────────────────────────────

interface AgentPublic {
  id: string
  first_name_th?: string | null
  last_name_th?: string | null
  nickname?: string | null
  position?: string | null
  company_name?: string | null
  team_name?: string | null
  bio?: string | null
  avatar_url?: string | null
  logo_url?: string | null
  line_id?: string | null
  phone?: string | null
  show_phone?: boolean | null
  public_slug?: string | null
  created_at: string
}

type StockCard = Pick<Stock, 'id' | 'unit_no' | 'room_type' | 'size_sqm' | 'floor' | 'rent_price' | 'sale_price' | 'listing_type' | 'photo_urls' | 'photo_thumb_urls' | 'project_name' | 'is_premium'> & {
  project?: { province?: string | null; district?: string | null; bts_mrt?: string[] | null } | null
}

// ── Metadata ──────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('profiles')
    .select('first_name_th, last_name_th, nickname, bio, avatar_url, logo_url')
    .eq('public_slug', slug)
    .eq('account_status', 'approved')
    .single()

  if (!data) return { title: 'ไม่พบเอเจนต์ — Proppsy' }

  const name = data.nickname
    || [data.first_name_th, data.last_name_th].filter(Boolean).join(' ')
    || 'เอเจนต์'
  const imageUrl = data.avatar_url || data.logo_url

  const description = data.bio || `ดูประกาศทรัพย์สินจาก ${name} บน Proppsy`
  return {
    title: `${name} — เอเจนต์อสังหาฯ · Proppsy`,
    description,
    openGraph: {
      title: `${name} — เอเจนต์อสังหาฯ`,
      description,
      type: 'profile',
      ...(imageUrl && { images: [{ url: imageUrl, width: 400, height: 400, alt: name }] }),
    },
    twitter: {
      card: imageUrl ? 'summary' : 'summary',
      title: `${name} — เอเจนต์อสังหาฯ`,
      description,
      ...(imageUrl && { images: [imageUrl] }),
    },
  }
}

// ── Page ──────────────────────────────────────────────────────

export default async function AgentProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const supabase = createServiceClient()

  // Fetch agent — only public-safe columns
  const { data: agentRaw } = await supabase
    .from('profiles')
    .select(`
      id, first_name_th, last_name_th, nickname,
      position, company_name, team_name,
      bio, avatar_url, logo_url,
      line_id, phone, show_phone,
      public_slug, created_at
    `)
    .eq('public_slug', slug)
    .eq('account_status', 'approved')
    .single()

  if (!agentRaw) notFound()
  const agent = agentRaw as AgentPublic

  // Fetch published available listings by this agent
  const { data: stocksRaw } = await supabase
    .from('stock')
    .select(`
      id, unit_no, room_type, size_sqm, floor,
      rent_price, sale_price, listing_type,
      photo_urls, photo_thumb_urls,
      project_name, is_premium,
      project:projects(province, district, bts_mrt)
    `)
    .eq('agent_uid', agent.id)
    .eq('is_published', true)
    .eq('status', 'available')
    .order('is_premium', { ascending: false })
    .order('published_at', { ascending: false })
    .limit(60)

  const stocks = (stocksRaw ?? []) as unknown as StockCard[]

  const displayName = agent.nickname
    || [agent.first_name_th, agent.last_name_th].filter(Boolean).join(' ')
    || 'เอเจนต์'

  const avatarUrl = agent.avatar_url || agent.logo_url
  const memberSince = new Date(agent.created_at).toLocaleDateString('th-TH', {
    year: 'numeric', month: 'long',
  })

  return (
    <div className="min-h-screen bg-gray-50 overflow-x-hidden">
      <PublicNav />

      <div className="max-w-5xl mx-auto px-4 py-6 pb-16">
        {/* ── Agent Profile Card ──────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
            {/* Avatar */}
            <AgentAvatar url={avatarUrl} name={displayName} size="xl" className="flex-shrink-0" />

            {/* Info */}
            <div className="flex-1 min-w-0 text-center sm:text-left">
              <h1 className="text-xl font-bold text-gray-900">{displayName}</h1>

              {agent.position && (
                <p className="text-sm text-gray-500 mt-0.5">{agent.position}</p>
              )}

              {(agent.company_name || agent.team_name) && (
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-3 gap-y-1 mt-2 text-xs text-gray-500">
                  {agent.company_name && (
                    <span className="flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5 text-gray-400" />
                      {agent.company_name}
                    </span>
                  )}
                  {agent.team_name && (
                    <span className="text-gray-300">·</span>
                  )}
                  {agent.team_name && (
                    <span>{agent.team_name}</span>
                  )}
                </div>
              )}

              {agent.bio && (
                <p className="text-sm text-gray-600 mt-3 leading-relaxed max-w-prose">
                  {agent.bio}
                </p>
              )}

              <div className="flex items-center justify-center sm:justify-start gap-1.5 mt-3 text-xs text-gray-400">
                <Calendar className="w-3.5 h-3.5" />
                <span>สมาชิกตั้งแต่ {memberSince}</span>
                <span className="text-gray-200">·</span>
                <span>{stocks.length} ประกาศ</span>
              </div>

              {/* Contact buttons */}
              <div className="flex flex-wrap justify-center sm:justify-start gap-2 mt-4">
                {agent.line_id && (
                  <a
                    href={`https://line.me/ti/p/~${agent.line_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white text-sm font-semibold rounded-xl transition"
                  >
                    <MessageCircle className="w-4 h-4" />
                    LINE
                  </a>
                )}
                {agent.show_phone && agent.phone && (
                  <a
                    href={`tel:${agent.phone}`}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition"
                  >
                    <Phone className="w-4 h-4" />
                    {agent.phone}
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Listings ─────────────────────────────────────────── */}
        <div>
          <h2 className="text-base font-semibold text-gray-700 mb-4">
            ประกาศทรัพย์สิน
            {stocks.length > 0 && (
              <span className="ml-2 text-sm font-normal text-gray-400">{stocks.length} ประกาศ</span>
            )}
          </h2>

          {stocks.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {stocks.map(stock => (
                <AgentListingCard key={stock.id} stock={stock} />
              ))}
            </div>
          ) : (
            <div className="text-center py-20 text-gray-400">
              <Building2 className="w-12 h-12 mx-auto mb-3 opacity-25" />
              <p className="text-sm">ยังไม่มีประกาศในขณะนี้</p>
            </div>
          )}
        </div>
      </div>

      <footer className="border-t border-gray-100 py-8 text-center text-xs text-gray-400">
        © {new Date().getFullYear()} Proppsy · Real Estate Management Platform
      </footer>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'RealEstateAgent',
            name: displayName,
            ...(agent.bio && { description: agent.bio }),
            ...(avatarUrl && { image: avatarUrl }),
            url: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://proppsy.vercel.app'}/agent/${slug}`,
            ...(agent.show_phone && agent.phone && { telephone: agent.phone }),
            ...(agent.company_name && {
              worksFor: { '@type': 'Organization', name: agent.company_name },
            }),
          }),
        }}
      />
    </div>
  )
}

// ── Listing Card ──────────────────────────────────────────────

function fmt(n: number) {
  return new Intl.NumberFormat('th-TH').format(n)
}

function AgentListingCard({ stock }: { stock: StockCard }) {
  const photo = stock.photo_thumb_urls?.[0] ?? stock.photo_urls?.[0]
  const isRent = stock.listing_type !== 'sale'
  const isSale = stock.listing_type !== 'rent'
  const price = stock.listing_type === 'sale' ? stock.sale_price : stock.rent_price
  const location = [stock.project?.district, stock.project?.province].filter(Boolean).join(', ')
  const bts = stock.project?.bts_mrt?.slice(0, 2) ?? []

  return (
    <Link
      href={`/listing/${stock.id}`}
      className={`group bg-white rounded-2xl overflow-hidden border shadow-sm hover:shadow-md transition-shadow block ${
        stock.is_premium ? 'border-orange-200 ring-1 ring-orange-200' : 'border-gray-100'
      }`}
    >
      {/* Image */}
      <div className="relative aspect-[4/3] bg-gray-100">
        <StorageImage
          src={photo}
          alt={stock.project_name ?? 'ทรัพย์'}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-300"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          fallback={
            <div className="absolute inset-0 flex items-center justify-center">
              <Building2 className="w-10 h-10 text-gray-200" />
            </div>
          }
        />
        <div className="absolute top-2 left-2 flex gap-1">
          {isRent && <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-blue-500/90 text-white backdrop-blur-sm">เช่า</span>}
          {isSale && stock.listing_type !== 'rent' && <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-green-500/90 text-white backdrop-blur-sm">ขาย</span>}
        </div>
        {stock.is_premium && (
          <span
            className="absolute top-2 right-2 text-[11px] px-2.5 py-0.5 rounded-full font-bold text-white animate-hot-glow"
            style={{ background: 'linear-gradient(135deg, #f97316 0%, #ef4444 100%)' }}
          >
            HOT
          </span>
        )}
      </div>

      {/* Info */}
      <div className="p-4">
        {price != null && (
          <p className="text-xl font-bold text-gray-900">
            ฿{fmt(price)}
            {stock.listing_type !== 'sale' && (
              <span className="text-sm font-normal text-gray-400">/เดือน</span>
            )}
          </p>
        )}
        <p className="text-sm font-medium text-gray-700 mt-0.5 truncate">
          {stock.project_name ?? 'ไม่ระบุโครงการ'}
          {stock.unit_no && <span className="text-gray-400 font-normal"> · {stock.unit_no}</span>}
        </p>
        {location && (
          <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
            <MapPin className="w-3 h-3 flex-shrink-0" />
            {location}
          </p>
        )}
        {bts.length > 0 && (
          <div className="flex gap-1 mt-1.5 flex-wrap">
            {bts.map(b => (
              <span key={b} className="text-[11px] px-2 py-0.5 bg-purple-50 text-purple-600 rounded-full border border-purple-100">
                {b}
              </span>
            ))}
          </div>
        )}
        <div className="flex items-center gap-2 mt-2 text-xs text-gray-400 flex-wrap">
          {stock.room_type && (
            <span className="bg-gray-50 px-2 py-0.5 rounded-full border border-gray-100">
              {stock.room_type}
            </span>
          )}
          {stock.size_sqm && (
            <span className="flex items-center gap-0.5">
              <Maximize className="w-3 h-3" />{stock.size_sqm} ตร.ม.
            </span>
          )}
          {stock.floor && (
            <span className="flex items-center gap-0.5">
              <Layers className="w-3 h-3" />ชั้น {stock.floor}
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}
