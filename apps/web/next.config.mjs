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
    'pdf-lib',
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
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'otlvjnmmcvqjzbxefbhw.supabase.co',
      },
    ],
  },
}

export default nextConfig
