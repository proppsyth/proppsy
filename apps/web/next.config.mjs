import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@workspace/ui"],
  serverExternalPackages: [
    '@react-pdf/renderer',
    'puppeteer',
    'puppeteer-core',
    '@puppeteer/browsers',
    '@sparticuz/chromium-min',
    '@sparticuz/chromium',
    'pdf-lib',
    'web-push',
  ],
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  turbopack: {
    root: path.resolve(__dirname, '../..'),
  },
  images: {
    // In dev mode, skip Next.js image optimization to avoid fetching from
    // Supabase storage on every page load — those fetches time out on localhost
    // and cause Supabase rate-limiting that makes the entire dev server hang.
    // Production (Vercel) uses normal optimization with remotePatterns.
    unoptimized: process.env.NODE_ENV === 'development',
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'otlvjnmmcvqjzbxefbhw.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'img.youtube.com',
      },
    ],
  },
}

export default nextConfig
