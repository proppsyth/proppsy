import type { Metadata, Viewport } from 'next'
import { IBM_Plex_Sans_Thai, IBM_Plex_Sans } from 'next/font/google'
import { SpeedInsights } from '@vercel/speed-insights/next'
import '@workspace/ui/globals.css'
import './globals.css'
import ServiceWorkerRegister from '@/components/ServiceWorkerRegister'

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
  title: {
    default: 'Proppsy — Real Estate Agent Management',
    template: '%s | Proppsy',
  },
  description: 'แพลตฟอร์มจัดการเอเจนต์อสังหาริมทรัพย์สำหรับตลาดไทย',
  manifest: '/manifest.json',
  icons: {
    icon: '/logo/logo.png',
    apple: '/logo/logo.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Proppsy',
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
        <ServiceWorkerRegister />
        {children}
        <SpeedInsights />
      </body>
    </html>
  )
}
