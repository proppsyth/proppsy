// Registry of all 9 canonical .docx contract templates
// Source of truth: apps/web/public/template-doc/

import type { ContractDocType } from '@/types'

export type LanguageVersion = 'th' | 'th_en' | 'th_en_zh'

export interface TemplateDefinition {
  slug: string
  docType: ContractDocType
  language: LanguageVersion
  filename: string              // filename inside public/template-doc/
  label: string                 // Thai display name
  languageLabel: string         // language display name
  hasFurniture: boolean         // show furniture checklist only for rental
  hasPaymentSchedule: boolean   // 12-month payment table
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
    label: 'สัญญาเช่า',
    languageLabel: 'ภาษาไทย',
    hasFurniture: true,
    hasPaymentSchedule: true,
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
    label: 'สัญญาเช่า',
    languageLabel: 'ไทย + อังกฤษ',
    hasFurniture: true,
    hasPaymentSchedule: true,
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
    label: 'สัญญาเช่า',
    languageLabel: 'ไทย + อังกฤษ + จีน',
    hasFurniture: true,
    hasPaymentSchedule: true,
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
    label: 'สัญญาจอง',
    languageLabel: 'ภาษาไทย',
    hasFurniture: false,
    hasPaymentSchedule: false,
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
    label: 'สัญญาจอง',
    languageLabel: 'ไทย + อังกฤษ',
    hasFurniture: false,
    hasPaymentSchedule: false,
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
    label: 'สัญญาจอง',
    languageLabel: 'ไทย + อังกฤษ + จีน',
    hasFurniture: false,
    hasPaymentSchedule: false,
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
    label: 'ต่อสัญญาเช่า',
    languageLabel: 'ภาษาไทย',
    hasFurniture: false,
    hasPaymentSchedule: false,
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
    label: 'ต่อสัญญาเช่า',
    languageLabel: 'ไทย + อังกฤษ',
    hasFurniture: false,
    hasPaymentSchedule: false,
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
    label: 'สัญญา Co-Agent',
    languageLabel: 'ไทย + อังกฤษ',
    hasFurniture: false,
    hasPaymentSchedule: false,
    requiredVars: [
      'agent', 'ชื่อ', 'เลขที่ห้อง', 'ชื่อผู้เช่า', 'ค่าเช่า',
    ],
    imageVars: ['iสำเนาบัตรประชาชน'],
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

// Doc types that have canonical .docx template support
export const TEMPLATE_SUPPORTED_TYPES = new Set<string>([
  'rental', 'reservation', 'renewal', 'co_agent',
])
