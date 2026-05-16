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

export function buildInquiryNotification(args: {
  projectName?: string
  unitNo?: string
  nickname: string
  budget?: string
  moveInDate?: string
  occupants?: string
  phone: string
  lineId?: string
}): string {
  const lines: string[] = [
    '🔥 New Property Inquiry',
    '',
    ...(args.projectName ? [`Project: ${args.projectName}`] : []),
    ...(args.unitNo ? [`Unit: ${args.unitNo}`] : []),
    '',
    `Name: ${args.nickname}`,
    ...(args.budget ? [`Budget: ${args.budget}`] : []),
    ...(args.moveInDate ? [`Move-in: ${args.moveInDate}`] : []),
    ...(args.occupants ? [`Occupants: ${args.occupants}`] : []),
    '',
    `Phone: ${args.phone}`,
    ...(args.lineId ? [`LINE: ${args.lineId}`] : []),
  ]
  return lines.join('\n')
}
