// Transactional email via Resend.
// Requires RESEND_API_KEY in the server environment. Sends from
// noreply@proppsy.com (the verified Resend domain). All sends are
// best-effort: callers should never let an email failure block the
// underlying action (inquiry submission, signing, etc.).

import { Resend } from 'resend'

const FROM = 'Proppsy <noreply@proppsy.com>'

export function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.proppsy.com'
}

export async function sendEmail(params: {
  to: string
  subject: string
  html: string
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey || !params.to) return

  try {
    const resend = new Resend(apiKey)
    await resend.emails.send({
      from: FROM,
      to: params.to,
      subject: params.subject,
      html: params.html,
    })
  } catch (err) {
    // Best-effort — never block the caller.
    console.error('sendEmail error:', err)
  }
}

// Shared, minimal, inline-styled shell so emails render consistently in
// Gmail/Outlook (which strip <style> blocks and class-based CSS).
function shell(opts: { heading: string; accent: string; bodyHtml: string }): string {
  return `
  <div style="margin:0;padding:24px 0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb;">
      <div style="background:${opts.accent};padding:20px 24px;">
        <p style="margin:0;color:#ffffff;font-size:18px;font-weight:700;">${opts.heading}</p>
      </div>
      <div style="padding:24px;color:#374151;font-size:14px;line-height:1.7;">
        ${opts.bodyHtml}
      </div>
      <div style="padding:16px 24px;border-top:1px solid #f3f4f6;color:#9ca3af;font-size:12px;">
        อีเมลนี้ส่งจากระบบ Proppsy โดยอัตโนมัติ — ไม่ต้องตอบกลับ
      </div>
    </div>
  </div>`
}

function row(label: string, value: string): string {
  return `<tr>
    <td style="padding:4px 0;color:#9ca3af;width:96px;vertical-align:top;">${label}</td>
    <td style="padding:4px 0;color:#111827;font-weight:600;">${value}</td>
  </tr>`
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function fmtPrice(n: number): string {
  return new Intl.NumberFormat('th-TH').format(n)
}

// ─── Inquiry ("สนใจ") notification ─────────────────────────────────────────
export function buildInquiryEmail(args: {
  projectName?: string
  unitNo?: string
  rentPrice?: number
  salePrice?: number
  listingType?: string
  listingUrl: string
  nickname: string
  phone?: string
  lineId?: string
  budget?: string
  moveInDate?: string
  gender?: string
  occupation?: string
  isReturning?: boolean
}): { subject: string; html: string } {
  const property = [args.projectName, args.unitNo].filter(Boolean).join(' · ') || 'ทรัพย์ของคุณ'

  const priceParts: string[] = []
  const isRent = args.listingType !== 'sale'
  const isSale = args.listingType !== 'rent'
  if (isRent && args.rentPrice) priceParts.push(`เช่า ฿${fmtPrice(args.rentPrice)}/เดือน`)
  if (isSale && args.salePrice) priceParts.push(`ขาย ฿${fmtPrice(args.salePrice)}`)

  const rows = [
    row('ชื่อ', esc(args.nickname)),
    args.phone ? row('เบอร์โทร', esc(args.phone)) : '',
    args.lineId ? row('LINE', esc(args.lineId)) : '',
    args.gender ? row('เพศ', esc(args.gender)) : '',
    args.occupation ? row('อาชีพ', esc(args.occupation)) : '',
    args.budget ? row('งบประมาณ', esc(args.budget)) : '',
    args.moveInDate ? row('ย้ายเข้า', esc(args.moveInDate)) : '',
  ].filter(Boolean).join('')

  const bodyHtml = `
    <p style="margin:0 0 12px;font-size:15px;font-weight:600;color:#111827;">
      ${args.isReturning ? '🔄 ลูกค้าเดิมสนใจทรัพย์ใหม่' : '🔥 มีผู้สนใจทรัพย์ของคุณ'}
    </p>
    <p style="margin:0 0 4px;color:#111827;font-weight:600;">🏠 ${esc(property)}</p>
    ${priceParts.length ? `<p style="margin:0 0 16px;color:#2563eb;font-weight:600;">💵 ${esc(priceParts.join('  |  '))}</p>` : ''}
    <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:20px;">${rows}</table>
    <a href="${args.listingUrl}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:10px 20px;border-radius:10px;">
      ดูทรัพย์ &amp; ติดต่อลูกค้า
    </a>`

  return {
    subject: `🔥 มีผู้สนใจ: ${property}`,
    html: shell({ heading: 'มีผู้สนใจทรัพย์', accent: '#f97316', bodyHtml }),
  }
}

// ─── Signature-completed notification ───────────────────────────────────────
export function buildSignedEmail(args: {
  contractId: string
  signerName?: string
  signerRoleLabel?: string
  propertyLabel?: string
  allSigned: boolean
  contractUrl: string
}): { subject: string; html: string } {
  const who = [args.signerRoleLabel, args.signerName].filter(Boolean).join(' · ') || 'ผู้ลงนาม'

  const rows = [
    row('สัญญา', esc(args.contractId)),
    args.propertyLabel ? row('ทรัพย์', esc(args.propertyLabel)) : '',
    row('ผู้ลงนาม', esc(who)),
  ].filter(Boolean).join('')

  const heading = args.allSigned ? '✅ สัญญาลงนามครบแล้ว' : '✍️ มีผู้ลงนามสัญญา'
  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:15px;font-weight:600;color:#111827;">
      ${args.allSigned ? 'ทุกฝ่ายลงนามครบถ้วนแล้ว' : `${esc(who)} ได้ลงนามแล้ว`}
    </p>
    <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:20px;">${rows}</table>
    <a href="${args.contractUrl}" style="display:inline-block;background:#16a34a;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:10px 20px;border-radius:10px;">
      ดูสัญญา
    </a>`

  return {
    subject: `${args.allSigned ? '✅ ลงนามครบ' : '✍️ มีผู้ลงนาม'}: สัญญา ${args.contractId}`,
    html: shell({ heading, accent: args.allSigned ? '#16a34a' : '#2563eb', bodyHtml }),
  }
}
