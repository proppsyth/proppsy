// LINE Flex Message builders — Proppsy blue theme.
// These produce the message objects passed to pushMessage().

const BLUE = '#2563EB'       // Proppsy primary (tailwind blue-600)
const BLUE_DARK = '#1E3A8A'
const INK = '#1F2937'
const MUTED = '#6B7280'
const LINE_LIGHT = '#E5E7EB'

function baht(n?: number | null): string {
  if (n == null) return '-'
  return '฿' + new Intl.NumberFormat('th-TH').format(n)
}

function row(label: string, value: string, opts: { strong?: boolean } = {}) {
  return {
    type: 'box',
    layout: 'horizontal',
    spacing: 'sm',
    contents: [
      { type: 'text', text: label, size: 'sm', color: MUTED, flex: 4 },
      {
        type: 'text', text: value, size: 'sm', color: INK, flex: 6, wrap: true,
        weight: opts.strong ? 'bold' : 'regular', align: 'end',
      },
    ],
  }
}

export interface RentReminderArgs {
  projectUnit: string       // "The Base · ห้อง 25/123"
  tenantName: string
  periodLabel: string       // "มิถุนายน 2569"
  rentAmount?: number | null
  paymentDayLabel: string   // "ทุกวันที่ 5"
  bankName?: string | null
  bankAccountNo?: string | null
  bankAccountName?: string | null
  contractUrl?: string | null
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function buildRentReminderFlex(a: RentReminderArgs): any {
  const bankLine = [a.bankName, a.bankAccountNo].filter(Boolean).join('  ')
  const bodyContents: object[] = [
    row('โครงการ / ห้อง', a.projectUnit),
    row('ผู้เช่า', a.tenantName),
    { type: 'separator', margin: 'md', color: LINE_LIGHT },
    {
      type: 'box', layout: 'horizontal', margin: 'md', contents: [
        { type: 'text', text: `ค่าเช่า (${a.periodLabel})`, size: 'sm', color: MUTED, flex: 6 },
        { type: 'text', text: baht(a.rentAmount), size: 'xl', color: BLUE, weight: 'bold', flex: 6, align: 'end' },
      ],
    },
    row('กำหนดชำระ', a.paymentDayLabel, { strong: true }),
  ]

  if (bankLine || a.bankAccountName) {
    bodyContents.push({ type: 'separator', margin: 'md', color: LINE_LIGHT })
    bodyContents.push({ type: 'text', text: 'โอนเข้าบัญชีเจ้าของ', size: 'xs', color: MUTED, margin: 'md' })
    if (bankLine) bodyContents.push({ type: 'text', text: bankLine, size: 'sm', color: INK, weight: 'bold' })
    if (a.bankAccountName) bodyContents.push({ type: 'text', text: `ชื่อบัญชี: ${a.bankAccountName}`, size: 'sm', color: INK })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const footer: any = a.contractUrl
    ? {
        type: 'box', layout: 'vertical', contents: [
          { type: 'button', style: 'secondary', height: 'sm',
            action: { type: 'uri', label: '📄 ดูไฟล์สัญญาเช่า', uri: a.contractUrl } },
        ],
      }
    : undefined

  return {
    type: 'flex',
    altText: `แจ้งเตือนค่าเช่า ${a.projectUnit} ${baht(a.rentAmount)}`,
    contents: {
      type: 'bubble',
      header: {
        type: 'box', layout: 'vertical', backgroundColor: BLUE, paddingAll: 'lg',
        contents: [{ type: 'text', text: '🏠 แจ้งเตือนค่าเช่า', color: '#FFFFFF', weight: 'bold', size: 'lg' }],
      },
      body: { type: 'box', layout: 'vertical', spacing: 'sm', contents: bodyContents },
      ...(footer ? { footer } : {}),
    },
  }
}

export interface ExpiryReminderArgs {
  projectUnit: string
  tenantName: string
  endDateLabel: string      // "18 กรกฎาคม 2569"
  daysLeft: number
  contractUrl?: string | null
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function buildExpiryReminderFlex(a: ExpiryReminderArgs): any {
  return {
    type: 'flex',
    altText: `สัญญาเช่าใกล้หมด ${a.projectUnit} (อีก ${a.daysLeft} วัน)`,
    contents: {
      type: 'bubble',
      header: {
        type: 'box', layout: 'vertical', backgroundColor: BLUE_DARK, paddingAll: 'lg',
        contents: [{ type: 'text', text: '⏰ สัญญาเช่าใกล้หมด', color: '#FFFFFF', weight: 'bold', size: 'lg' }],
      },
      body: {
        type: 'box', layout: 'vertical', spacing: 'sm', contents: [
          row('ห้อง', a.projectUnit),
          row('ผู้เช่า', a.tenantName),
          { type: 'separator', margin: 'md', color: LINE_LIGHT },
          row('วันสิ้นสุดสัญญา', a.endDateLabel, { strong: true }),
          row('เหลืออีก', `${a.daysLeft} วัน`, { strong: true }),
          { type: 'text', text: 'แจ้งล่วงหน้าเพื่อตัดสินใจต่อสัญญา', size: 'xs', color: MUTED, margin: 'md', wrap: true },
        ],
      },
      ...(a.contractUrl ? {
        footer: {
          type: 'box', layout: 'vertical', contents: [
            { type: 'button', style: 'secondary', height: 'sm',
              action: { type: 'uri', label: '📄 ดูไฟล์สัญญาเช่า', uri: a.contractUrl } },
          ],
        },
      } : {}),
    },
  }
}
