// LINE Messaging API — push message to a specific LINE user
// Requires LINE_OA_CHANNEL_TOKEN in server environment
// Agent must have line_user_id (U...) stored in profiles to receive notifications

export async function pushLineMessage(lineUserId: string, text: string): Promise<void> {
  const token = process.env.LINE_OA_CHANNEL_TOKEN
  if (!token || !lineUserId) return

  try {
    await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        to: lineUserId,
        messages: [{ type: 'text', text }],
      }),
    })
  } catch {
    // Notification is best-effort — never block the inquiry submission
  }
}

function fmtPrice(n: number) {
  return new Intl.NumberFormat('th-TH').format(n)
}

export function buildInquiryNotification(args: {
  projectName?: string
  unitNo?: string
  rentPrice?: number
  salePrice?: number
  listingType?: string
  listingUrl?: string
  nickname: string
  budget?: string
  moveInDate?: string
  gender?: string
  occupation?: string
  phone?: string
  lineId?: string
  isReturning?: boolean
}): string {
  const now = new Date()
  const timeStr = now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
  const dateStr = now.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })

  const property = [args.projectName, args.unitNo].filter(Boolean).join(' · ')

  // Price line — show rent, sale, or both depending on listing_type
  const priceParts: string[] = []
  const isRent = args.listingType !== 'sale'
  const isSale = args.listingType !== 'rent'
  if (isRent && args.rentPrice) priceParts.push(`เช่า ฿${fmtPrice(args.rentPrice)}/เดือน`)
  if (isSale && args.salePrice) priceParts.push(`ขาย ฿${fmtPrice(args.salePrice)}`)

  const lines: string[] = [
    args.isReturning ? '🔄 ลูกค้าเดิม สนใจทรัพย์ใหม่!' : '🔥 มีคนสนใจทรัพย์สิน!',
    '─────────────────',
    ...(property ? [`🏠 ${property}`] : []),
    ...(priceParts.length ? [`💵 ${priceParts.join('  |  ')}`] : []),
    ...(args.listingUrl ? [`🔗 ${args.listingUrl}`] : []),
    '',
    `👤 ${args.nickname}`,
    ...(args.gender ? [`   เพศ: ${args.gender}`] : []),
    ...(args.occupation ? [`   อาชีพ: ${args.occupation}`] : []),
    ...(args.budget ? [`💰 งบ: ${args.budget}/เดือน`] : []),
    ...(args.moveInDate ? [`📅 ย้ายเข้า: ${args.moveInDate}`] : []),
    '',
    '─────────────────',
    ...(args.phone ? [`📞 ${args.phone}`] : []),
    ...(args.lineId ? [`💬 LINE: ${args.lineId}`] : []),
    `⏰ ${dateStr} ${timeStr}`,
  ]
  return lines.join('\n')
}
