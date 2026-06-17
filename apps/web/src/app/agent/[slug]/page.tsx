import { notFound } from 'next/navigation'
import { Building2, Phone, MessageCircle, Calendar } from 'lucide-react'
import type { Metadata } from 'next'
import { createServiceClient } from '@/lib/supabase/server'
import type { Stock } from '@/types'
import PublicNav from '@/components/shared/PublicNav'
import AgentAvatar from '@/components/shared/AgentAvatar'
import AgentListingsSection from './AgentListingsSection'

// ── Types ─────────────────────────────────────────────────────

interface AgentPublic {
  id: string
  name?: string | null
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
    .select('name, first_name_th, last_name_th, nickname, bio')
    .eq('public_slug', slug)
    .eq('account_status', 'approved')
    .single()

  if (!data) return { title: 'ไม่พบเอเจนต์ — Proppsy' }

  const name = data.nickname
    || data.name
    || [data.first_name_th, data.last_name_th].filter(Boolean).join(' ')
    || 'เอเจนต์'

  const description = data.bio || `ดูประกาศทรัพย์สินจาก ${name} บน Proppsy`
  // og:image / twitter:image handled by co-located opengraph-image.tsx
  return {
    title: `${name} — เอเจนต์อสังหาฯ · Proppsy`,
    description,
    alternates: { canonical: `/agent/${slug}` },
    openGraph: {
      title: `${name} — เอเจนต์อสังหาฯ`,
      description,
      type: 'profile',
      url: `/agent/${slug}`,
    },
    twitter: {
      card: 'summary',
      title: `${name} — เอเจนต์อสังหาฯ`,
      description,
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
      id, name, first_name_th, last_name_th, nickname,
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

  // Fall back to the agent's Google/OAuth avatar when they have no uploaded
  // photo (OAuth picture lives in auth.user_metadata, not profiles.avatar_url)
  if (!agent.avatar_url) {
    try {
      const { data: authUser } = await supabase.auth.admin.getUserById(agent.id)
      const meta = authUser?.user?.user_metadata as { avatar_url?: string; picture?: string } | undefined
      const googleAvatar = meta?.avatar_url ?? meta?.picture
      if (googleAvatar) agent.avatar_url = googleAvatar
    } catch {
      // best-effort — avatar fallback should never break the page
    }
  }

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
    || agent.name
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
        <AgentListingsSection stocks={stocks} />
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
            url: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.proppsy.com'}/agent/${slug}`,
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

