// LINE Messaging API client — per-agent OA.
// All calls take the agent's own channel access token; nothing here reads a
// global env token (that's the separate central-OA helper in src/lib/lineOa.ts).
// Server-only.

const LINE_API = 'https://api.line.me/v2/bot'

export interface LineBotInfo {
  userId: string
  basicId: string
  displayName: string
  pictureUrl?: string
}

export interface LineResult {
  ok: boolean
  status: number
  error?: string
}

/** Validate a channel access token and fetch the bot's own profile. */
export async function getBotInfo(token: string): Promise<{ info?: LineBotInfo; error?: string }> {
  try {
    const res = await fetch(`${LINE_API}/info`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    })
    if (!res.ok) {
      if (res.status === 401) return { error: 'Token ไม่ถูกต้องหรือหมดอายุ (401)' }
      return { error: `LINE ตอบกลับ ${res.status}` }
    }
    const data = (await res.json()) as LineBotInfo
    return { info: data }
  } catch {
    return { error: 'เชื่อมต่อ LINE ไม่สำเร็จ' }
  }
}

/** Best-effort group display name (requires the bot to be a member). */
export async function getGroupSummary(token: string, groupId: string): Promise<string | null> {
  try {
    const res = await fetch(`${LINE_API}/group/${groupId}/summary`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    })
    if (!res.ok) return null
    const data = (await res.json()) as { groupName?: string }
    return data.groupName ?? null
  } catch {
    return null
  }
}

/** Push one or more LINE messages to a user / group / room. */
export async function pushMessage(
  token: string,
  to: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  messages: any[],
): Promise<LineResult> {
  try {
    const res = await fetch(`${LINE_API}/message/push`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ to, messages }),
    })
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      return { ok: false, status: res.status, error: body.slice(0, 300) || `HTTP ${res.status}` }
    }
    return { ok: true, status: res.status }
  } catch (e) {
    return { ok: false, status: 0, error: (e as Error).message }
  }
}
