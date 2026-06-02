/**
 * HeroBanner — homepage hero/search section.
 *
 * Data source (priority order):
 *   1. Active banners from DB (position = 'home_top') — full-image slides
 *   2. Hardcoded gradient slides (fallback when no DB banners are active)
 *
 * The component is split into a server wrapper (data fetch) and a client
 * carousel (interaction), so the hero is still server-rendered on initial load.
 */

import Image from 'next/image'
import { createServiceClient } from '@/lib/supabase/server'
import HeroBannerClient from './HeroBannerClient'

export interface HeroSlide {
  type: 'image' | 'gradient'
  // image slide
  imageUrl?: string
  linkUrl?: string
  title?: string
  // gradient slide
  gradient?: string
  tag?: string
  subtitle?: string
  showSearch?: boolean
}

const FALLBACK_SLIDES: HeroSlide[] = [
  {
    type: 'gradient',
    gradient: 'from-blue-900 via-blue-700 to-indigo-800',
    tag: '🏠 Proppsy Real Estate',
    title: 'ค้นหาที่พักในฝัน\nทั่วประเทศไทย',
    subtitle: 'ทรัพย์สินคุณภาพพร้อมเอเจนต์มืออาชีพดูแลคุณตลอด 24 ชั่วโมง',
    showSearch: true,
  },
  {
    type: 'gradient',
    gradient: 'from-violet-900 via-purple-700 to-indigo-800',
    tag: '🤖 AI Smart Paste',
    title: 'เพิ่มทรัพย์ใน\n10 วินาที',
    subtitle: 'วางข้อความจาก Line แล้วให้ AI เติมข้อมูลให้อัตโนมัติ ประหยัดเวลาทำงานได้มากกว่า 80%',
    showSearch: false,
  },
  {
    type: 'gradient',
    gradient: 'from-emerald-900 via-teal-700 to-cyan-800',
    tag: '📄 สัญญาครบ 9 ประเภท',
    title: 'PDF ภาษาไทย\nพร้อมลายเซ็นดิจิทัล',
    subtitle: 'ออกสัญญาเช่า จอง ใบเสร็จ คอมมิชชัน ได้ในคลิกเดียว รองรับลายเซ็นอิเล็กทรอนิกส์',
    showSearch: false,
  },
]

export default async function HeroBanner({ currentQ }: { currentQ: string }) {
  const supabase = createServiceClient()
  const today = new Date().toISOString().split('T')[0]!

  const { data: bannerRows } = await supabase
    .from('banners')
    .select('id, title, image_url, link_url')
    .eq('position', 'home_top')
    .eq('is_active', true)
    .or(`start_date.is.null,start_date.lte.${today}`)
    .or(`end_date.is.null,end_date.gte.${today}`)
    .order('sort_order')

  const dbSlides: HeroSlide[] = (bannerRows ?? [])
    .filter(b => b.image_url)
    .map(b => ({
      type: 'image' as const,
      imageUrl: b.image_url!,
      linkUrl: b.link_url ?? undefined,
      title: b.title ?? undefined,
    }))

  const slides = dbSlides.length > 0 ? dbSlides : FALLBACK_SLIDES

  return <HeroBannerClient slides={slides} currentQ={currentQ} />
}
