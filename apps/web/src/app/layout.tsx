import type { Metadata, Viewport } from 'next'
import { IBM_Plex_Sans_Thai, IBM_Plex_Sans } from 'next/font/google'
import { SpeedInsights } from '@vercel/speed-insights/next'
import '@workspace/ui/globals.css'
import './globals.css'
import ServiceWorkerRegister from '@/components/ServiceWorkerRegister'
import { CompareProvider } from '@/contexts/compare'

const ibmPlexSansThai = IBM_Plex_Sans_Thai({
  subsets: ['thai', 'latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-thai',
  display: 'swap',
})

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-latin',
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.proppsy.com'),
  title: {
    default: 'Proppsy — ค้นหาที่พักและทรัพย์สิน',
    template: '%s | Proppsy',
  },
  description: 'ค้นหาคอนโด บ้าน และทรัพย์สินให้เช่า-ขายในประเทศไทย ดูประกาศจากเอเจนต์มืออาชีพบน Proppsy',
  manifest: '/manifest.json',
  icons: {
    icon: '/logo/logo.png',
    apple: '/logo/logo-icon.jpg',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Proppsy',
  },
  openGraph: {
    type: 'website',
    locale: 'th_TH',
    siteName: 'Proppsy',
    title: 'Proppsy — ค้นหาที่พักและทรัพย์สิน',
    description: 'ค้นหาคอนโด บ้าน และทรัพย์สินให้เช่า-ขายในประเทศไทย ดูประกาศจากเอเจนต์มืออาชีพบน Proppsy',
  },
  twitter: {
    card: 'summary_large_image',
    site: '@proppsy',
    title: 'Proppsy — ค้นหาที่พักและทรัพย์สิน',
    description: 'ค้นหาคอนโด บ้าน และทรัพย์สินให้เช่า-ขายในประเทศไทย',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#2563EB',
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="th" suppressHydrationWarning>
      <body className={`${ibmPlexSansThai.variable} ${ibmPlexSans.variable} font-thai antialiased`}>
        <CompareProvider>
          <ServiceWorkerRegister />
          {children}
          <SpeedInsights />
        </CompareProvider>
      </body>
    </html>
  )
}
