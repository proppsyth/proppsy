// Transactional email via Resend.
// Requires RESEND_API_KEY in the server environment. Sends from
// noreply@proppsy.com (the verified Resend domain). All sends are
// best-effort: callers should never let an email failure block the
// underlying action (inquiry submission, signing, approval, etc.).
//
// All notification emails share one blue-toned shell that mirrors the
// Supabase auth email templates (gradient header + logo + footer).

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

// ─── Shared blue shell (table-based for Gmail/Outlook compatibility) ────────
function shell(opts: { title: string; heading: string; bodyHtml: string }): string {
  const logo = `${siteUrl()}/logo/logo-icon.jpg`
  const year = new Date().getFullYear()
  return `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>${opts.title} — Proppsy</title>
</head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#1d4ed8 0%,#2563eb 100%);padding:28px 32px;text-align:center;">
            <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
              <tr>
                <td style="padding-right:10px;vertical-align:middle;">
                  <img src="${logo}" alt="Proppsy" width="40" height="40" style="border-radius:10px;display:block;object-fit:contain;" />
                </td>
                <td style="vertical-align:middle;">
                  <span style="font-size:22px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">Proppsy</span>
                </td>
              </tr>
            </table>
            <p style="margin:10px 0 0;font-size:13px;color:rgba(255,255,255,0.7);">Real Estate Management Platform</p>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:36px 32px 28px;">
            <h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#111827;">${opts.heading}</h1>
            ${opts.bodyHtml}
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background:#f9fafb;border-top:1px solid #f3f4f6;padding:20px 32px;text-align:center;">
            <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.7;">
              © ${year} Proppsy · Real Estate Management Platform<br>
              อีเมลนี้ส่งจากระบบอัตโนมัติ กรุณาอย่าตอบกลับ
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

function button(href: string, label: string): string {
  return `<a href="${href}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 24px;border-radius:12px;">${label}</a>`
}

// Blue highlight box (info table)
function infoBox(rowsHtml: string): string {
  return `<table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
    <tr><td style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:14px;padding:18px 20px;">
      <table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;">${rowsHtml}</table>
    </td></tr>
  </table>`
}

function row(label: string, value: string): string {
  return `<tr>
    <td style="padding:4px 0;color:#6b7280;width:110px;vertical-align:top;">${label}</td>
    <td style="padding:4px 0;color:#111827;font-weight:600;">${value}</td>
  </tr>`
}

// Big centered amount box (for credits)
function amountBox(label: string, value: string, sub?: string): string {
  return `<table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
    <tr><td style="background:#eff6ff;border:2px solid #bfdbfe;border-radius:16px;padding:24px;text-align:center;">
      <p style="margin:0 0 8px;font-size:11px;font-weight:700;color:#3b82f6;text-transform:uppercase;letter-spacing:2px;">${label}</p>
      <p style="margin:0;font-size:44px;font-weight:900;color:#1e40af;line-height:1;">${value}</p>
      ${sub ? `<p style="margin:12px 0 0;font-size:12px;color:#93c5fd;">${sub}</p>` : ''}
    </td></tr>
  </table>`
}

function intro(text: string): string {
  return `<p style="margin:0 0 24px;font-size:14px;color:#6b7280;line-height:1.7;">${text}</p>`
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function fmtNumber(n: number): string {
  return new Intl.NumberFormat('th-TH').format(n)
}

const PLAN_TH: Record<string, string> = {
  starter: 'Starter',
  professional: 'Professional',
  business: 'Business',
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
  if (isRent && args.rentPrice) priceParts.push(`เช่า ฿${fmtNumber(args.rentPrice)}/เดือน`)
  if (isSale && args.salePrice) priceParts.push(`ขาย ฿${fmtNumber(args.salePrice)}`)

  const rows = [
    row('ทรัพย์', esc(property)),
    priceParts.length ? row('ราคา', esc(priceParts.join('  |  '))) : '',
    row('ชื่อ', esc(args.nickname)),
    args.phone ? row('เบอร์โทร', esc(args.phone)) : '',
    args.lineId ? row('LINE', esc(args.lineId)) : '',
    args.gender ? row('เพศ', esc(args.gender)) : '',
    args.occupation ? row('อาชีพ', esc(args.occupation)) : '',
    args.budget ? row('งบประมาณ', esc(args.budget)) : '',
    args.moveInDate ? row('ย้ายเข้า', esc(args.moveInDate)) : '',
  ].filter(Boolean).join('')

  const bodyHtml = `
    ${intro(args.isReturning ? 'ลูกค้าเดิมกลับมาสนใจทรัพย์ใหม่ของคุณ ติดต่อกลับเพื่อปิดการขายได้เลย' : 'มีผู้สนใจทรัพย์ที่คุณประกาศไว้ รายละเอียดผู้ติดต่อด้านล่าง')}
    ${infoBox(rows)}
    ${button(args.listingUrl, 'ดูทรัพย์ & ติดต่อลูกค้า')}`

  return {
    subject: `🔥 มีผู้สนใจ: ${property}`,
    html: shell({ title: 'มีผู้สนใจทรัพย์', heading: args.isReturning ? '🔄 ลูกค้าเดิมสนใจทรัพย์ใหม่' : '🔥 มีผู้สนใจทรัพย์ของคุณ', bodyHtml }),
  }
}

// ─── Signature notification (one email per signer, no "all signed" wording) ──
export function buildSignedEmail(args: {
  contractId: string
  signerName?: string
  signerRoleLabel?: string
  propertyLabel?: string
  contractUrl: string
}): { subject: string; html: string } {
  const who = [args.signerRoleLabel, args.signerName].filter(Boolean).join(' · ') || 'ผู้ลงนาม'
  const rows = [
    row('สัญญา', esc(args.contractId)),
    args.propertyLabel ? row('ทรัพย์', esc(args.propertyLabel)) : '',
    row('ผู้ลงนาม', esc(who)),
  ].filter(Boolean).join('')

  const bodyHtml = `
    ${intro(`${esc(who)} ได้ลงนามในสัญญาเรียบร้อยแล้ว`)}
    ${infoBox(rows)}
    ${button(args.contractUrl, 'ดูสัญญา')}`

  return {
    subject: `✍️ มีผู้ลงนาม: สัญญา ${args.contractId}`,
    html: shell({ title: 'มีผู้ลงนาม', heading: '✍️ มีผู้ลงนามสัญญา', bodyHtml }),
  }
}

// ─── Account-approved notification ──────────────────────────────────────────
export function buildApprovedEmail(args: {
  name?: string
  dashboardUrl: string
}): { subject: string; html: string } {
  const greeting = args.name ? `สวัสดีคุณ ${esc(args.name)} 🎉` : 'ยินดีต้อนรับสู่ Proppsy! 🎉'
  const bodyHtml = `
    ${intro(`${greeting}<br><br>บัญชี Proppsy ของคุณได้รับการ <strong style="color:#111827;">อนุมัติ</strong> เรียบร้อยแล้ว ตอนนี้คุณสามารถ <strong style="color:#111827;">เผยแพร่ทรัพย์</strong> และ <strong style="color:#111827;">ออกเอกสารสัญญา</strong> ได้เต็มรูปแบบ`)}
    ${button(args.dashboardUrl, 'เริ่มใช้งาน')}`

  return {
    subject: '🎉 บัญชี Proppsy ของคุณได้รับการอนุมัติแล้ว',
    html: shell({ title: 'บัญชีได้รับการอนุมัติ', heading: '🎉 บัญชีได้รับการอนุมัติ', bodyHtml }),
  }
}

// ─── Admin granted credits ──────────────────────────────────────────────────
export function buildCreditGrantedEmail(args: {
  name?: string
  amount: number
  note?: string
  newBalance?: number
  creditsUrl: string
}): { subject: string; html: string } {
  const rows = [
    args.note ? row('รายละเอียด', esc(args.note)) : '',
    args.newBalance != null ? row('ยอดคงเหลือ', `${fmtNumber(args.newBalance)} เครดิต`) : '',
  ].filter(Boolean).join('')

  const bodyHtml = `
    ${intro(`${args.name ? `สวัสดีคุณ ${esc(args.name)}<br><br>` : ''}แอดมินได้เพิ่มเครดิตเข้าบัญชีของคุณโดยไม่มีค่าใช้จ่าย คุณสามารถใช้เครดิตนี้เผยแพร่ทรัพย์ได้ทันที`)}
    ${amountBox('เครดิตที่ได้รับ', `+${fmtNumber(args.amount)}`, 'เพิ่มโดยแอดมิน')}
    ${rows ? infoBox(rows) : ''}
    ${button(args.creditsUrl, 'ดูเครดิตของฉัน')}`

  return {
    subject: `💎 คุณได้รับ ${fmtNumber(args.amount)} เครดิตจากแอดมิน`,
    html: shell({ title: 'ได้รับเครดิต', heading: '💎 คุณได้รับเครดิตเพิ่ม', bodyHtml }),
  }
}

// ─── Admin changed plan/package ─────────────────────────────────────────────
export function buildPlanChangedEmail(args: {
  name?: string
  plan: string
  planExpiresAt?: string | null
  profileUrl: string
}): { subject: string; html: string } {
  const planLabel = PLAN_TH[args.plan] ?? args.plan
  const expiry = args.planExpiresAt
    ? new Date(args.planExpiresAt).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })
    : 'ไม่มีกำหนดหมดอายุ'

  const bodyHtml = `
    ${intro(`${args.name ? `สวัสดีคุณ ${esc(args.name)}<br><br>` : ''}แอดมินได้ปรับแพ็กเกจบัญชีของคุณให้แล้ว โดยไม่มีค่าใช้จ่ายเพิ่มเติม`)}
    ${amountBox('แพ็กเกจปัจจุบัน', esc(planLabel))}
    ${infoBox(row('หมดอายุ', esc(expiry)))}
    ${button(args.profileUrl, 'ดูข้อมูลแพ็กเกจ')}`

  return {
    subject: `⭐ แพ็กเกจของคุณถูกปรับเป็น ${planLabel}`,
    html: shell({ title: 'ปรับแพ็กเกจ', heading: '⭐ แพ็กเกจได้รับการอัปเดต', bodyHtml }),
  }
}
