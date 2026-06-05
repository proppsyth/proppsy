// Registry of all canonical contract templates
// Source of truth: apps/web/public/template-doc/ (docx) and public/template-md/ (markdown)

import type { ContractDocType } from '@/types'

export type LanguageVersion = 'th' | 'th_en' | 'th_en_zh'

export interface TemplateDefinition {
  slug: string
  docType: ContractDocType
  language: LanguageVersion
  filename: string              // filename inside public/template-doc/
  mdFilename?: string           // optional .md template in public/template-md/ (preferred over DOCX)
  label: string                 // Thai display name
  languageLabel: string         // language display name
  hasFurniture: boolean         // show furniture checklist only for rental
  hasPaymentSchedule: boolean   // 12-month payment table
  hasBuiltInSignatures: boolean // template already has signature blocks — skip auto-inject
  // Variables that MUST be present before generation
  requiredVars: string[]
  // Image placeholder names — replaced with empty in docx (not embedded)
  imageVars: string[]
}

export const TEMPLATE_REGISTRY: TemplateDefinition[] = [
  // ─── Rental ──────────────────────────────────────────────────
  {
    slug: 'rental_th',
    docType: 'rental',
    language: 'th',
    filename: 'สัญญาเช่าไทย.docx',
    mdFilename: 'rental_th.md',
    label: 'สัญญาเช่า',
    languageLabel: 'ภาษาไทย',
    hasFurniture: true,
    hasPaymentSchedule: true,
    hasBuiltInSignatures: true,
    requiredVars: [
      'ชื่อผู้ให้เช่า', 'ชื่อผู้เช่า',
      'view', 'เลขที่ห้องชุด',
      'ค่าเช่าเติมลูกน้ำ', 'ค่าเช่าตัวอักษร',
      'ทำสัญญาวันที่ตัวอักษร', 'ทำสัญญาวันที่สิ้นสุดตัวอักษร',
    ],
    imageVars: ['bankimg', 'imagelink1', 'รูปสำเนาบัตรประชาชนผู้เช่า', 'สมุดบัญชีผู้ให้เช่า'],
  },
  {
    slug: 'rental_th_en',
    docType: 'rental',
    language: 'th_en',
    filename: 'สัญญาเช่าอังกฤษไทย.docx',
    mdFilename: 'rental_th_en.md',
    label: 'สัญญาเช่า',
    languageLabel: 'ไทย + อังกฤษ',
    hasFurniture: true,
    hasPaymentSchedule: true,
    hasBuiltInSignatures: true,
    requiredVars: [
      'ชื่อผู้ให้เช่า', 'ชื่อผู้เช่า',
      'view', 'เลขที่ห้องชุด',
      'ค่าเช่าเติมลูกน้ำ', 'ค่าเช่าตัวอักษร', 'ค่าเช่าภาษาอังกฤษ',
      'ทำสัญญาวันที่ตัวอักษร',
    ],
    imageVars: ['bankimg', 'imagelink1'],
  },
  {
    slug: 'rental_th_en_zh',
    docType: 'rental',
    language: 'th_en_zh',
    filename: 'สัญญาเช่าจีนอังกฤษไทย.docx',
    mdFilename: 'rental_th_en_zh.md',
    label: 'สัญญาเช่า',
    languageLabel: 'ไทย + อังกฤษ + จีน',
    hasFurniture: true,
    hasPaymentSchedule: true,
    hasBuiltInSignatures: true,
    requiredVars: [
      'ชื่อผู้ให้เช่า', 'ชื่อผู้เช่า',
      'view', 'เลขที่ห้องชุด',
      'ค่าเช่าเติมลูกน้ำ', 'ค่าเช่าตัวอักษร',
    ],
    imageVars: ['bankimg', 'imagelink1', 'imagelink2', 'imagelink3'],
  },

  // ─── Reservation ─────────────────────────────────────────────
  {
    slug: 'reservation_th',
    docType: 'reservation',
    language: 'th',
    filename: 'สัญญาจองไทย.docx',
    mdFilename: 'reservation_th.md',
    label: 'สัญญาจอง',
    languageLabel: 'ภาษาไทย',
    hasFurniture: false,
    hasPaymentSchedule: false,
    hasBuiltInSignatures: true,
    requiredVars: [
      'ชื่อผู้ให้เช่า', 'ชื่อผู้เช่า',
      'view', 'เลขที่ห้องชุด',
      'จำนวนเงินวันทำสัญญา', 'จำนวนเงินวันทำสัญญาตัวอักษร',
    ],
    imageVars: [],
  },
  {
    slug: 'reservation_th_en',
    docType: 'reservation',
    language: 'th_en',
    filename: 'สัญญาจองอังกฤษไทย.docx',
    mdFilename: 'reservation_th_en.md',
    label: 'สัญญาจอง',
    languageLabel: 'ไทย + อังกฤษ',
    hasFurniture: false,
    hasPaymentSchedule: false,
    hasBuiltInSignatures: true,
    requiredVars: [
      'ชื่อผู้ให้เช่า', 'ชื่อผู้เช่า',
      'view', 'เลขที่ห้องชุด',
      'จำนวนเงินวันทำสัญญา',
    ],
    imageVars: [],
  },
  {
    slug: 'reservation_th_en_zh',
    docType: 'reservation',
    language: 'th_en_zh',
    filename: 'สัญญาจองจีนอังกฤษไทย.docx',
    mdFilename: 'reservation_th_en_zh.md',
    label: 'สัญญาจอง',
    languageLabel: 'ไทย + อังกฤษ + จีน',
    hasFurniture: false,
    hasPaymentSchedule: false,
    hasBuiltInSignatures: true,
    requiredVars: [
      'ชื่อผู้ให้เช่า', 'ชื่อผู้เช่า',
      'view', 'เลขที่ห้องชุด',
      'จำนวนเงินวันทำสัญญา',
    ],
    imageVars: [],
  },

  // ─── Renewal ─────────────────────────────────────────────────
  {
    slug: 'renewal_th',
    docType: 'renewal',
    language: 'th',
    filename: 'ต่อสัญญาไทย.docx',
    mdFilename: 'renewal_th.md',
    label: 'ต่อสัญญาเช่า',
    languageLabel: 'ภาษาไทย',
    hasFurniture: false,
    hasPaymentSchedule: false,
    hasBuiltInSignatures: true,
    requiredVars: [
      'ชื่อ - สกุล เจ้าของ', 'ชื่อ - สกุล ลูกค้า',
      'project', 'เลขที่ห้อง',
      'ค่าเช่า', 'ค่าเช่าบาท',
      'เริ่มต่อสัญญา', 'ขยายเวลาสิ้นสุดเป็นวันที่',
    ],
    imageVars: [],
  },
  {
    slug: 'renewal_th_en',
    docType: 'renewal',
    language: 'th_en',
    filename: 'ต่อสัญญาไทยอังกฤษ.docx',
    mdFilename: 'renewal_th_en.md',
    label: 'ต่อสัญญาเช่า',
    languageLabel: 'ไทย + อังกฤษ',
    hasFurniture: false,
    hasPaymentSchedule: false,
    hasBuiltInSignatures: true,
    requiredVars: [
      'ชื่อ - สกุล เจ้าของ', 'ชื่อ - สกุล ลูกค้า',
      'project', 'เลขที่ห้อง',
      'ค่าเช่า', 'ค่าเช่าบาท',
      'เริ่มต่อสัญญา', 'ขยายเวลาสิ้นสุดเป็นวันที่',
    ],
    imageVars: [],
  },
  {
    slug: 'renewal_th_en_zh',
    docType: 'renewal',
    language: 'th_en_zh',
    filename: 'ต่อสัญญาไทยอังกฤษ.docx',
    mdFilename: 'renewal_th_en_zh.md',
    label: 'ต่อสัญญาเช่า',
    languageLabel: 'ไทย + อังกฤษ + จีน',
    hasFurniture: false,
    hasPaymentSchedule: false,
    hasBuiltInSignatures: true,
    requiredVars: [
      'ชื่อ - สกุล เจ้าของ', 'ชื่อ - สกุล ลูกค้า',
      'project', 'เลขที่ห้อง',
      'ค่าเช่า', 'ค่าเช่าบาท',
      'เริ่มต่อสัญญา', 'ขยายเวลาสิ้นสุดเป็นวันที่',
    ],
    imageVars: [],
  },

  // ─── Co-Agent ────────────────────────────────────────────────
  {
    slug: 'co_agent_th_en',
    docType: 'co_agent' as ContractDocType,
    language: 'th_en',
    filename: 'สัญญาco-agentอังกฤษไทย.docx',
    mdFilename: 'co_agent_th_en.md',
    label: 'สัญญา Co-Agent',
    languageLabel: 'ไทย + อังกฤษ',
    hasFurniture: false,
    hasPaymentSchedule: false,
    hasBuiltInSignatures: true,
    requiredVars: [
      'agent', 'ชื่อ', 'เลขที่ห้อง', 'ชื่อผู้เช่า', 'ค่าเช่า',
    ],
    imageVars: ['iสำเนาบัตรประชาชน'],
  },

  // ─── Payment Schedule ────────────────────────────────────────
  {
    slug: 'installment_schedule_th_en',
    docType: 'installment_schedule' as ContractDocType,
    language: 'th_en',
    filename: 'สัญญาเช่าอังกฤษไทย.docx',
    mdFilename: 'installment_schedule_th_en.md',
    label: 'ตารางผ่อนชำระ',
    languageLabel: 'ไทย + อังกฤษ',
    hasFurniture: false,
    hasPaymentSchedule: true,
    hasBuiltInSignatures: false,
    requiredVars: ['ชื่อผู้ให้เช่า', 'ชื่อผู้เช่า', 'view', 'เลขที่ห้องชุด', 'ค่าเช่าเติมลูกน้ำ'],
    imageVars: [],
  },

  // ─── Invoice ─────────────────────────────────────────────────
  {
    slug: 'invoice_reservation_th_en',
    docType: 'invoice_reservation' as ContractDocType,
    language: 'th_en',
    filename: 'invoice_th_en.docx',
    mdFilename: 'invoice_th_en.md',
    label: 'ใบแจ้งหนี้ (จอง)',
    languageLabel: 'ไทย + อังกฤษ',
    hasFurniture: false,
    hasPaymentSchedule: false,
    hasBuiltInSignatures: true,
    requiredVars: ['ชื่อผู้เช่า', 'ชื่อผู้ให้เช่า', 'รายละเอียดใบแจ้งหนี้', 'ยอดรวมสุทธิ'],
    imageVars: [],
  },
  {
    slug: 'invoice_deposit_th_en',
    docType: 'invoice_deposit' as ContractDocType,
    language: 'th_en',
    filename: 'invoice_th_en.docx',
    mdFilename: 'invoice_th_en.md',
    label: 'ใบแจ้งหนี้ (เงินประกัน)',
    languageLabel: 'ไทย + อังกฤษ',
    hasFurniture: false,
    hasPaymentSchedule: false,
    hasBuiltInSignatures: true,
    requiredVars: ['ชื่อผู้เช่า', 'ชื่อผู้ให้เช่า', 'รายละเอียดใบแจ้งหนี้', 'ยอดรวมสุทธิ'],
    imageVars: [],
  },

  // ─── Receipt ─────────────────────────────────────────────────
  {
    slug: 'receipt_reservation_th_en',
    docType: 'receipt_reservation' as ContractDocType,
    language: 'th_en',
    filename: 'receipt_th_en.docx',
    mdFilename: 'receipt_th_en.md',
    label: 'ใบเสร็จรับเงิน (จอง)',
    languageLabel: 'ไทย + อังกฤษ',
    hasFurniture: false,
    hasPaymentSchedule: false,
    hasBuiltInSignatures: true,
    requiredVars: ['ชื่อผู้เช่า', 'ชื่อผู้ให้เช่า', 'รายละเอียดใบแจ้งหนี้', 'ยอดรวมสุทธิ', 'วิธีชำระเงิน'],
    imageVars: [],
  },
  {
    slug: 'receipt_deposit_th_en',
    docType: 'receipt_deposit' as ContractDocType,
    language: 'th_en',
    filename: 'receipt_th_en.docx',
    mdFilename: 'receipt_th_en.md',
    label: 'ใบเสร็จรับเงิน (เงินประกัน)',
    languageLabel: 'ไทย + อังกฤษ',
    hasFurniture: false,
    hasPaymentSchedule: false,
    hasBuiltInSignatures: true,
    requiredVars: ['ชื่อผู้เช่า', 'ชื่อผู้ให้เช่า', 'รายละเอียดใบแจ้งหนี้', 'ยอดรวมสุทธิ', 'วิธีชำระเงิน'],
    imageVars: [],
  },

  // ─── Notice / Warning ────────────────────────────────────────
  {
    slug: 'notice_th_en',
    docType: 'notice' as ContractDocType,
    language: 'th_en',
    filename: 'notice_th_en.docx',
    mdFilename: 'notice_th_en.md',
    label: 'หนังสือแจ้ง',
    languageLabel: 'ไทย + อังกฤษ',
    hasFurniture: false,
    hasPaymentSchedule: false,
    hasBuiltInSignatures: true,
    requiredVars: ['ชื่อผู้เช่า', 'ชื่อผู้ให้เช่า', 'เหตุผล', 'รายละเอียด'],
    imageVars: [],
  },
  {
    slug: 'warning_th_en',
    docType: 'warning' as ContractDocType,
    language: 'th_en',
    filename: 'notice_th_en.docx',
    mdFilename: 'notice_th_en.md',
    label: 'หนังสือเตือน',
    languageLabel: 'ไทย + อังกฤษ',
    hasFurniture: false,
    hasPaymentSchedule: false,
    hasBuiltInSignatures: true,
    requiredVars: ['ชื่อผู้เช่า', 'ชื่อผู้ให้เช่า', 'เหตุผล', 'รายละเอียด'],
    imageVars: [],
  },

  // ─── Termination / Cancellation / End ────────────────────────
  {
    slug: 'termination_th_en',
    docType: 'termination' as ContractDocType,
    language: 'th_en',
    filename: 'termination_th_en.docx',
    mdFilename: 'termination_th_en.md',
    label: 'หนังสือบอกเลิกสัญญา',
    languageLabel: 'ไทย + อังกฤษ',
    hasFurniture: false,
    hasPaymentSchedule: false,
    hasBuiltInSignatures: true,
    requiredVars: ['ชื่อผู้เช่า', 'ชื่อผู้ให้เช่า', 'สิ้นสุดสัญญาวันที่', 'รายละเอียด'],
    imageVars: [],
  },
  {
    slug: 'cancellation_th_en',
    docType: 'cancellation' as ContractDocType,
    language: 'th_en',
    filename: 'termination_th_en.docx',
    mdFilename: 'termination_th_en.md',
    label: 'หนังสือยกเลิกสัญญา',
    languageLabel: 'ไทย + อังกฤษ',
    hasFurniture: false,
    hasPaymentSchedule: false,
    hasBuiltInSignatures: true,
    requiredVars: ['ชื่อผู้เช่า', 'ชื่อผู้ให้เช่า', 'สิ้นสุดสัญญาวันที่', 'รายละเอียด'],
    imageVars: [],
  },
  {
    slug: 'end_contract_th_en',
    docType: 'end_contract' as ContractDocType,
    language: 'th_en',
    filename: 'termination_th_en.docx',
    mdFilename: 'termination_th_en.md',
    label: 'หนังสือสิ้นสุดสัญญา',
    languageLabel: 'ไทย + อังกฤษ',
    hasFurniture: false,
    hasPaymentSchedule: false,
    hasBuiltInSignatures: true,
    requiredVars: ['ชื่อผู้เช่า', 'ชื่อผู้ให้เช่า', 'สิ้นสุดสัญญาวันที่', 'รายละเอียด'],
    imageVars: [],
  },
]

export function getTemplateBySlug(slug: string): TemplateDefinition | undefined {
  return TEMPLATE_REGISTRY.find(t => t.slug === slug)
}

export function getTemplatesForDocType(docType: string): TemplateDefinition[] {
  return TEMPLATE_REGISTRY.filter(t => t.docType === docType)
}

export function defaultSlugForDocType(docType: string): string | undefined {
  return getTemplatesForDocType(docType)[0]?.slug
}

export const LANGUAGE_LABELS: Record<LanguageVersion, string> = {
  th: 'ภาษาไทย',
  th_en: 'ไทย + อังกฤษ',
  th_en_zh: 'ไทย + อังกฤษ + จีน',
}

// Doc types that have canonical markdown template support
export const TEMPLATE_SUPPORTED_TYPES = new Set<string>([
  'rental', 'reservation', 'renewal', 'co_agent', 'installment_schedule',
  'invoice_reservation', 'invoice_deposit',
  'receipt_reservation', 'receipt_deposit',
  'notice', 'warning',
  'termination', 'cancellation', 'end_contract',
])
