import type { MetadataRoute } from 'next'
import { createServiceClient } from '@/lib/supabase/server'

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://proppsy.vercel.app'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createServiceClient()

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE,                  lastModified: new Date(), changeFrequency: 'daily',   priority: 1.0 },
    { url: `${BASE}/news`,        lastModified: new Date(), changeFrequency: 'weekly',  priority: 0.7 },
    { url: `${BASE}/articles`,    lastModified: new Date(), changeFrequency: 'weekly',  priority: 0.7 },
    { url: `${BASE}/faq`,         lastModified: new Date(), changeFrequency: 'weekly',  priority: 0.6 },
    { url: `${BASE}/about`,       lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE}/contact`,     lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE}/services`,    lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE}/help`,        lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
  ]

  const [stocksRes, agentsRes, newsRes, articlesRes] = await Promise.all([
    supabase
      .from('stock')
      .select('id, updated_at, published_at')
      .eq('is_published', true)
      .eq('status', 'available')
      .order('published_at', { ascending: false })
      .limit(5000),

    supabase
      .from('profiles')
      .select('public_slug, updated_at')
      .not('public_slug', 'is', null)
      .eq('account_status', 'approved')
      .limit(2000),

    supabase
      .from('news')
      .select('id, updated_at, created_at')
      .eq('published', true)
      .order('created_at', { ascending: false })
      .limit(1000),

    supabase
      .from('articles')
      .select('slug, updated_at, published_at')
      .eq('is_published', true)
      .order('published_at', { ascending: false })
      .limit(1000),
  ])

  const listingRoutes: MetadataRoute.Sitemap = (stocksRes.data ?? []).map(s => ({
    url: `${BASE}/listing/${s.id}`,
    lastModified: new Date(s.updated_at ?? s.published_at ?? new Date()),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }))

  const agentRoutes: MetadataRoute.Sitemap = (agentsRes.data ?? [])
    .filter((a): a is typeof a & { public_slug: string } => a.public_slug != null)
    .map(a => ({
      url: `${BASE}/agent/${a.public_slug}`,
      lastModified: new Date(a.updated_at ?? new Date()),
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    }))

  const newsRoutes: MetadataRoute.Sitemap = (newsRes.data ?? []).map(n => ({
    url: `${BASE}/news/${n.id}`,
    lastModified: new Date(n.updated_at ?? n.created_at ?? new Date()),
    changeFrequency: 'monthly' as const,
    priority: 0.5,
  }))

  const articleRoutes: MetadataRoute.Sitemap = (articlesRes.data ?? []).map(a => ({
    url: `${BASE}/articles/${a.slug}`,
    lastModified: new Date(a.updated_at ?? a.published_at ?? new Date()),
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }))

  return [...staticRoutes, ...listingRoutes, ...agentRoutes, ...newsRoutes, ...articleRoutes]
}
