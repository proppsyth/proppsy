import type { MetadataRoute } from 'next'

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.proppsy.com'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/listing/', '/agent/', '/news/', '/about', '/contact', '/how-to', '/services'],
        disallow: [
          '/dashboard/',
          '/profile/',
          '/stock/',
          '/contract/',
          '/admin/',
          '/api/',
          '/sign/',
          '/login',
          '/register',
        ],
      },
    ],
    sitemap: `${BASE}/sitemap.xml`,
  }
}
