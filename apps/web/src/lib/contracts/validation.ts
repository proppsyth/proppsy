// Pre-generation validation: ensure all required variables are non-empty

import type { TemplateDefinition } from './templateRegistry'

export interface ValidationResult {
  valid: boolean
  missing: Array<{ key: string; label: string }>
}

// Human-readable labels for required variable names
const VAR_LABELS: Record<string, string> = {
  'ชื่อผู้ให้เช่า':                   'ชื่อเจ้าของทรัพย์',
  'ชื่อผู้เช่า':                      'ชื่อผู้เช่า',
  'ชื่อ - สกุล เจ้าของ':              'ชื่อ-สกุลเจ้าของ',
  'ชื่อ - สกุล ลูกค้า':               'ชื่อ-สกุลผู้เช่า',
  'view':                              'ชื่อโครงการ',
  'project':                           'ชื่อโครงการ',
  'เลขที่ห้องชุด':                    'เลขที่ห้อง',
  'เลขที่ห้อง':                       'เลขที่ห้อง',
  'ค่าเช่าเติมลูกน้ำ':                'ค่าเช่า (ตัวเลข)',
  'ค่าเช่าตัวอักษร':                  'ค่าเช่า (ตัวอักษร)',
  'ค่าเช่าภาษาอังกฤษ':               'ค่าเช่า (อังกฤษ)',
  'ค่าเช่า':                          'ค่าเช่า',
  'ค่าเช่าบาท':                       'ค่าเช่า (ตัวอักษร)',
  'จำนวนเงินวันทำสัญญา':             'จำนวนเงินจอง/มัดจำ',
  'จำนวนเงินวันทำสัญญาตัวอักษร':    'จำนวนเงินจอง/มัดจำ (ตัวอักษร)',
  'ทำสัญญาวันที่ตัวอักษร':           'วันที่ทำสัญญา',
  'ทำสัญญาวันที่สิ้นสุดตัวอักษร':   'วันสิ้นสุดสัญญา',
  'เริ่มต่อสัญญา':                    'วันเริ่มต่อสัญญา',
  'ขยายเวลาสิ้นสุดเป็นวันที่':       'วันสิ้นสุดสัญญาใหม่',
  'agent':                             'ชื่อบริษัท/เอเจนต์',
  'ชื่อ':                             'ชื่อ Co-Agent',
}

function label(key: string): string {
  return VAR_LABELS[key] ?? key
}

export function validateVariables(
  vars: Record<string, string>,
  template: TemplateDefinition,
): ValidationResult {
  const missing: Array<{ key: string; label: string }> = []

  for (const key of template.requiredVars) {
    const val = vars[key]
    if (!val || val === '-' || val.trim() === '') {
      missing.push({ key, label: label(key) })
    }
  }

  return { valid: missing.length === 0, missing }
}
