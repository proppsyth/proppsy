// Single source of truth for all document template variables.
// computeVariables() in variableCompute.ts is the runtime implementation —
// this registry is for documentation, admin tooling, and future template authoring.

export type VariableSource = 'computed' | 'extra_vars' | 'computed_or_extra' | 'alias'

export type VariableCategory =
  | 'contract'
  | 'renewal'
  | 'property'
  | 'owner'
  | 'tenant'
  | 'agent'
  | 'financial'
  | 'commission'
  | 'co_agent'
  | 'payment_schedule'
  | 'notice'

export const CATEGORY_LABEL: Record<VariableCategory, string> = {
  contract:         'สัญญา (วันที่ & ข้อมูลหลัก)',
  renewal:          'ต่อสัญญา (สัญญาเดิม)',
  property:         'ทรัพย์สิน / ห้องชุด',
  owner:            'เจ้าของ / ผู้ให้เช่า',
  tenant:           'ผู้เช่า / ลูกค้า',
  agent:            'ตัวแทน (Agent)',
  financial:        'การเงิน',
  commission:       'ค่าคอมมิชชั่น',
  co_agent:         'Co-Agent',
  payment_schedule: 'ตารางชำระเงิน',
  notice:           'หนังสือบอกกล่าว',
}

export interface VariableDefinition {
  key: string
  label: string
  description: string
  category: VariableCategory
  source: VariableSource
  /** canonical key this is an alias of */
  aliasOf?: string
}

export const DOCUMENT_VARIABLE_REGISTRY: VariableDefinition[] = [

  // ─── CONTRACT ─────────────────────────────────────────────────────────────

  { key: 'เลขที่สัญญา',                   label: 'เลขที่สัญญา',              description: 'รหัสสัญญา (BK-XXXX)',                                  category: 'contract', source: 'computed' },
  { key: 'ทำสัญญาวันที่ตัวอักษร',          label: 'วันทำสัญญา (ตัวอักษรเต็ม)',  description: 'วันที่มีผลของสัญญา เขียนเป็นข้อความภาษาไทยเต็ม',          category: 'contract', source: 'computed' },
  { key: 'ทำสัญญาวันที่ภาษาไทย',           label: 'วันทำสัญญา (ไทย)',           description: 'วันที่มีผลของสัญญา รูปแบบย่อภาษาไทย',                    category: 'contract', source: 'computed' },
  { key: 'ทำสัญญาวันที่ภาษาอังกฤษ',        label: 'วันทำสัญญา (อังกฤษ)',        description: 'วันที่มีผลของสัญญา รูปแบบย่อภาษาอังกฤษ',                  category: 'contract', source: 'computed' },
  { key: 'ทำสัญญาวันที่ภาษาอังกฤษLong',    label: 'วันทำสัญญา (อังกฤษ ยาว)',    description: 'วันที่มีผลของสัญญา รูปแบบยาวภาษาอังกฤษ',                  category: 'contract', source: 'computed' },
  { key: 'ปีที่ทำสัญญา',                   label: 'ปีที่ทำสัญญา (พ.ศ.)',        description: 'ปีพุทธศักราชที่ทำสัญญา',                                  category: 'contract', source: 'computed' },
  { key: 'ทำสัญญาเดือนอย่างเดียว',          label: 'เดือนที่ทำสัญญา',            description: 'เลขเดือน (1–12) ที่ทำสัญญา',                             category: 'contract', source: 'computed' },
  { key: 'ทำสัญญาวันอย่างเดียว',            label: 'วันที่ทำสัญญา (ตัวเลข)',     description: 'เลขวันของเดือนที่ทำสัญญา',                                category: 'contract', source: 'computed' },

  // Contract creation date (raw document date, not effective date)
  { key: 'เมื่อวันที่',                    label: 'วันที่สร้างเอกสาร (ไทย)',    description: 'วันที่สร้างสัญญาในระบบ รูปแบบย่อภาษาไทย',                category: 'contract', source: 'alias', aliasOf: 'ทำสัญญาวันที่ภาษาไทย' },
  { key: 'thเมื่อวันที่',                  label: 'วันที่สร้างเอกสาร (ไทย)',    description: 'เหมือน <<เมื่อวันที่>>',                                   category: 'contract', source: 'alias', aliasOf: 'ทำสัญญาวันที่ภาษาไทย' },
  { key: 'เมื่อวันที่ภาษาไทย',             label: 'วันที่สร้างเอกสาร (ไทย)',    description: 'เหมือน <<เมื่อวันที่>>',                                   category: 'contract', source: 'alias', aliasOf: 'ทำสัญญาวันที่ภาษาไทย' },
  { key: 'enเมื่อวันที่',                  label: 'วันที่สร้างเอกสาร (อังกฤษ)', description: 'วันที่สร้างสัญญาในระบบ รูปแบบภาษาอังกฤษ',                 category: 'contract', source: 'alias', aliasOf: 'ทำสัญญาวันที่ภาษาอังกฤษ' },
  { key: 'เมื่อวันที่ภาษาอังกฤษ',          label: 'วันที่สร้างเอกสาร (อังกฤษ)', description: 'เหมือน <<enเมื่อวันที่>>',                                  category: 'contract', source: 'alias', aliasOf: 'ทำสัญญาวันที่ภาษาอังกฤษ' },

  // Move-in / lease start date
  { key: 'วันเข้าอยู่ตัวอักษร',            label: 'วันเข้าอยู่ (ตัวอักษรเต็ม)', description: 'วันที่ผู้เช่าเข้าพัก เขียนเป็นข้อความภาษาไทยเต็ม',         category: 'contract', source: 'computed' },
  { key: 'วันเข้าอยู่ภาษาไทย',             label: 'วันเข้าอยู่ (ไทย)',           description: 'วันที่ผู้เช่าเข้าพัก รูปแบบย่อภาษาไทย',                   category: 'contract', source: 'computed' },
  { key: 'วันเข้าอยู่ภาษาอังกฤษLong',      label: 'วันเข้าอยู่ (อังกฤษ ยาว)',   description: 'วันที่ผู้เช่าเข้าพัก รูปแบบยาวภาษาอังกฤษ',                 category: 'contract', source: 'computed' },

  // Scheduled signing date (= move_in_date in reservation context)
  { key: 'วันนัดทำสัญญาตัวอักษร',          label: 'วันนัดทำสัญญา (ตัวอักษรเต็ม)', description: 'วันนัดหมายทำสัญญา/วันเข้าอยู่ ข้อความภาษาไทยเต็ม',    category: 'contract', source: 'computed' },
  { key: 'วันนัดทำสัญญาภาษาไทย',           label: 'วันนัดทำสัญญา (ไทย)',         description: 'วันนัดหมายทำสัญญา รูปแบบย่อภาษาไทย',                     category: 'contract', source: 'computed' },
  { key: 'วันนัดทำสัญญาภาษาอังกฤษ',        label: 'วันนัดทำสัญญา (อังกฤษ)',      description: 'วันนัดหมายทำสัญญา รูปแบบย่อภาษาอังกฤษ',                   category: 'contract', source: 'computed' },
  { key: 'วันนัดทำสัญญาภาษาอังกฤษLong',    label: 'วันนัดทำสัญญา (อังกฤษ ยาว)', description: 'วันนัดหมายทำสัญญา รูปแบบยาวภาษาอังกฤษ',                   category: 'contract', source: 'computed' },

  // Lease end date
  { key: 'ทำสัญญาวันที่สิ้นสุดตัวอักษร',    label: 'วันสิ้นสุดสัญญา (ตัวอักษรเต็ม)', description: 'วันสิ้นสุดสัญญา ข้อความภาษาไทยเต็ม',               category: 'contract', source: 'computed' },
  { key: 'สิ้นสุดสัญญาวันที่',              label: 'วันสิ้นสุดสัญญา (ไทย)',      description: 'วันสิ้นสุดสัญญา รูปแบบย่อภาษาไทย',                        category: 'contract', source: 'computed' },
  { key: 'enสิ้นสุดสัญญาวันที่',            label: 'วันสิ้นสุดสัญญา (อังกฤษ)',   description: 'วันสิ้นสุดสัญญา รูปแบบย่อภาษาอังกฤษ',                     category: 'contract', source: 'computed' },
  { key: 'enสิ้นสุดสัญญาวันที่Long',        label: 'วันสิ้นสุดสัญญา (อังกฤษ ยาว)', description: 'วันสิ้นสุดสัญญา รูปแบบยาวภาษาอังกฤษ',                 category: 'contract', source: 'computed' },
  { key: 'ทำสัญญาวันที่สิ้นสุดภาษาไทย',    label: 'วันสิ้นสุดสัญญา (ไทย)',      description: 'เหมือน <<สิ้นสุดสัญญาวันที่>>',                            category: 'contract', source: 'alias', aliasOf: 'สิ้นสุดสัญญาวันที่' },
  { key: 'ทำสัญญาวันที่สิ้นสุดภาษาอังกฤษ', label: 'วันสิ้นสุดสัญญา (อังกฤษ)',   description: 'เหมือน <<enสิ้นสุดสัญญาวันที่>>',                          category: 'contract', source: 'alias', aliasOf: 'enสิ้นสุดสัญญาวันที่' },
  { key: 'ทำสัญญาวันที่สิ้นสุดภาษาอังกฤษLong', label: 'วันสิ้นสุดสัญญา (อังกฤษ ยาว)', description: 'เหมือน <<enสิ้นสุดสัญญาวันที่Long>>',            category: 'contract', source: 'alias', aliasOf: 'enสิ้นสุดสัญญาวันที่Long' },
  { key: 'ขยายเวลาสิ้นสุดเป็นวันที่',       label: 'วันสิ้นสุดต่อสัญญา (ไทย)',   description: 'วันสิ้นสุดสัญญา ใช้ในบริบทต่อสัญญา รูปแบบย่อภาษาไทย',      category: 'contract', source: 'alias', aliasOf: 'สิ้นสุดสัญญาวันที่' },
  { key: 'enขยายเวลาสิ้นสุดเป็นวันที่',     label: 'วันสิ้นสุดต่อสัญญา (อังกฤษ)', description: 'วันสิ้นสุดสัญญา ใช้ในบริบทต่อสัญญา รูปแบบย่อภาษาอังกฤษ', category: 'contract', source: 'alias', aliasOf: 'enสิ้นสุดสัญญาวันที่' },
  { key: 'enขยายเวลาสิ้นสุดเป็นวันที่Long', label: 'วันสิ้นสุดต่อสัญญา (อังกฤษ ยาว)', description: 'เหมือน <<enสิ้นสุดสัญญาวันที่Long>>',              category: 'contract', source: 'alias', aliasOf: 'enสิ้นสุดสัญญาวันที่Long' },
  { key: 'ปีสิ้นสุด',                      label: 'ปีสิ้นสุดสัญญา (พ.ศ.)',      description: 'ปีพุทธศักราชที่สิ้นสุดสัญญา',                              category: 'contract', source: 'computed' },
  { key: 'ปีที่สิ้นสุดไทย',               label: 'ปีสิ้นสุดสัญญา (พ.ศ.)',      description: 'เหมือน <<ปีสิ้นสุด>>',                                     category: 'contract', source: 'alias', aliasOf: 'ปีสิ้นสุด' },
  { key: 'ปีที่สิ้นสุดอังกฤษ',            label: 'ปีสิ้นสุดสัญญา (ค.ศ.)',      description: 'ปีคริสต์ศักราชที่สิ้นสุดสัญญา',                            category: 'contract', source: 'computed' },
  { key: 'เดือนที่สิ้นสุด',               label: 'เดือนสิ้นสุดสัญญา',           description: 'ชื่อเดือนภาษาไทยที่สิ้นสุดสัญญา',                          category: 'contract', source: 'computed' },
  { key: 'เดือนสิ้นสุด',                  label: 'เดือนสิ้นสุดสัญญา',           description: 'เหมือน <<เดือนที่สิ้นสุด>>',                               category: 'contract', source: 'alias', aliasOf: 'เดือนที่สิ้นสุด' },
  { key: 'วันที่สิ้นสุด',                 label: 'วันสิ้นสุดสัญญา (ตัวเลข)',    description: 'เลขวันของเดือนที่สิ้นสุดสัญญา',                            category: 'contract', source: 'computed' },

  // Reservation expiry
  { key: 'วันหมดอายุการจอง',               label: 'วันหมดอายุการจอง (ไทย)',      description: 'วันสิ้นอายุการจอง รูปแบบย่อภาษาไทย',                      category: 'contract', source: 'computed' },
  { key: 'วันหมดอายุการจองตัวอักษร',        label: 'วันหมดอายุการจอง (ตัวอักษรเต็ม)', description: 'วันสิ้นอายุการจอง ข้อความภาษาไทยเต็ม',              category: 'contract', source: 'computed' },
  { key: 'วันหมดอายุการจองภาษาอังกฤษLong',  label: 'วันหมดอายุการจอง (อังกฤษ ยาว)', description: 'วันสิ้นอายุการจอง รูปแบบยาวภาษาอังกฤษ',                category: 'contract', source: 'computed' },

  // Duration and payment timing
  { key: 'ระยะเวลาสัญญา',                  label: 'ระยะเวลาสัญญา (เดือน)',       description: 'จำนวนเดือนของสัญญา (contract_months)',                    category: 'contract', source: 'computed' },
  { key: 'ระยะเวลาต่อสัญญา',               label: 'ระยะเวลาต่อสัญญา (เดือน)',    description: 'เหมือน <<ระยะเวลาสัญญา>>',                                 category: 'contract', source: 'alias', aliasOf: 'ระยะเวลาสัญญา' },
  { key: 'ระยะเวลาสัญญาปี',               label: 'ระยะเวลาสัญญา (ปี/เดือน)',    description: 'ระยะเวลาสัญญาในรูปแบบ "X ปี Y เดือน"',                    category: 'contract', source: 'computed' },
  { key: 'ทำสัญญาวันที่อย่างเดียว',         label: 'วันชำระเงิน (ตัวเลข)',        description: 'วันของเดือนที่ต้องชำระค่าเช่า (payment_day_of_month)',    category: 'contract', source: 'computed' },
  { key: 'พ้นกำหนดชำระได้ไม่เกิน',          label: 'วันผ่อนผันชำระ (วัน)',        description: 'จำนวนวันผ่อนผันหลังกำหนดชำระ (payment_grace_days)',       category: 'contract', source: 'computed' },
  { key: 'พ้นกำหนดชำระได้',               label: 'วันผ่อนผันชำระ (วัน)',        description: 'เหมือน <<พ้นกำหนดชำระได้ไม่เกิน>>',                        category: 'contract', source: 'alias', aliasOf: 'พ้นกำหนดชำระได้ไม่เกิน' },

  // Move-in as renewal start alias
  { key: 'เริ่มต่อสัญญา',                  label: 'วันเริ่มต้นสัญญา/ต่อสัญญา (ไทย)',    description: 'วันเริ่มต้น (move_in_date) รูปแบบย่อภาษาไทย',      category: 'contract', source: 'computed' },
  { key: 'enเริ่มต่อสัญญา',               label: 'วันเริ่มต้นสัญญา/ต่อสัญญา (อังกฤษ)',  description: 'วันเริ่มต้น รูปแบบย่อภาษาอังกฤษ',                   category: 'contract', source: 'computed' },
  { key: 'enเริ่มต่อสัญญาLong',           label: 'วันเริ่มต้นสัญญา/ต่อสัญญา (อังกฤษ ยาว)', description: 'วันเริ่มต้น รูปแบบยาวภาษาอังกฤษ',               category: 'contract', source: 'computed' },

  // ─── RENEWAL ──────────────────────────────────────────────────────────────

  { key: 'old_lease_no',                   label: 'เลขที่สัญญาเดิม',             description: 'เลขที่สัญญาเช่าฉบับก่อนหน้า',                              category: 'renewal', source: 'computed' },
  { key: 'old_lease_start_date',           label: 'วันเริ่มต้นสัญญาเดิม (ไทย)',  description: 'วันเริ่มต้นสัญญาเช่าฉบับเก่า รูปแบบย่อภาษาไทย',            category: 'renewal', source: 'computed' },
  { key: 'old_lease_start_date_long_en',   label: 'วันเริ่มต้นสัญญาเดิม (อังกฤษ ยาว)', description: 'วันเริ่มต้นสัญญาเช่าฉบับเก่า รูปแบบยาวภาษาอังกฤษ', category: 'renewal', source: 'computed' },
  { key: 'old_lease_end_date',             label: 'วันสิ้นสุดสัญญาเดิม (ไทย)',   description: 'วันสิ้นสุดสัญญาเช่าฉบับเก่า รูปแบบย่อภาษาไทย',             category: 'renewal', source: 'computed' },
  { key: 'old_lease_end_date_long_en',     label: 'วันสิ้นสุดสัญญาเดิม (อังกฤษ ยาว)', description: 'วันสิ้นสุดสัญญาเช่าฉบับเก่า รูปแบบยาวภาษาอังกฤษ',   category: 'renewal', source: 'computed' },
  { key: 'renewal_start_date',             label: 'วันเริ่มต้นสัญญาใหม่ (ไทย)',  description: 'วันเริ่มต้นช่วงต่อสัญญา รูปแบบย่อภาษาไทย',                 category: 'renewal', source: 'computed' },
  { key: 'renewal_start_date_long_en',     label: 'วันเริ่มต้นสัญญาใหม่ (อังกฤษ ยาว)', description: 'วันเริ่มต้นช่วงต่อสัญญา รูปแบบยาวภาษาอังกฤษ',      category: 'renewal', source: 'computed' },
  { key: 'renewal_end_date',               label: 'วันสิ้นสุดสัญญาใหม่ (ไทย)',   description: 'วันสิ้นสุดช่วงต่อสัญญา รูปแบบย่อภาษาไทย',                  category: 'renewal', source: 'computed' },
  { key: 'renewal_end_date_long_en',       label: 'วันสิ้นสุดสัญญาใหม่ (อังกฤษ ยาว)', description: 'วันสิ้นสุดช่วงต่อสัญญา รูปแบบยาวภาษาอังกฤษ',        category: 'renewal', source: 'computed' },
  { key: 'สัญญาเช่าฉบับเก่าลงวันที่',      label: 'วันสัญญาเช่าฉบับเก่า (ไทย)', description: 'Alias ของ <<old_lease_start_date>> สำหรับเทมเพลตเก่า',     category: 'renewal', source: 'alias', aliasOf: 'old_lease_start_date' },
  { key: 'enสัญญาเช่าฉบับเก่าลงวันที่',   label: 'วันสัญญาเช่าฉบับเก่า (อังกฤษ)', description: 'Alias ของ <<old_lease_start_date>> รูปแบบย่อภาษาอังกฤษ', category: 'renewal', source: 'alias', aliasOf: 'old_lease_start_date' },
  { key: 'enสัญญาเช่าฉบับเก่าลงวันที่Long', label: 'วันสัญญาเช่าฉบับเก่า (อังกฤษ ยาว)', description: 'Alias ของ <<old_lease_start_date_long_en>>',      category: 'renewal', source: 'alias', aliasOf: 'old_lease_start_date_long_en' },

  // ─── PROPERTY ─────────────────────────────────────────────────────────────

  { key: 'โครงการ',                         label: 'ชื่อโครงการ (ไทย)',           description: 'ชื่อโครงการ/อาคาร',                                         category: 'property', source: 'computed' },
  { key: 'ชื่อโครงการภาษาอังกฤษ',           label: 'ชื่อโครงการ (อังกฤษ)',        description: 'ชื่อโครงการภาษาอังกฤษ (จาก projects.name_en)',               category: 'property', source: 'computed' },
  { key: 'project',                          label: 'ชื่อโครงการ',                 description: 'Alias ของ <<โครงการ>>',                                     category: 'property', source: 'alias', aliasOf: 'โครงการ' },
  { key: 'view',                             label: 'ชื่อโครงการ',                 description: 'Alias ของ <<โครงการ>> สำหรับเทมเพลตเก่า',                   category: 'property', source: 'alias', aliasOf: 'โครงการ' },
  { key: 'showp',                            label: 'ชื่อโครงการ',                 description: 'Alias ของ <<โครงการ>> สำหรับเทมเพลตเก่า',                   category: 'property', source: 'alias', aliasOf: 'โครงการ' },
  { key: 'เลขที่ห้องชุด',                   label: 'เลขที่ห้อง/ยูนิต',            description: 'หมายเลขห้องชุด (stock.unit_no)',                             category: 'property', source: 'computed' },
  { key: 'เลขที่ห้อง',                      label: 'เลขที่ห้อง/ยูนิต',            description: 'Alias ของ <<เลขที่ห้องชุด>>',                               category: 'property', source: 'alias', aliasOf: 'เลขที่ห้องชุด' },
  { key: 'ขนาด',                            label: 'ขนาดห้อง (ตร.ม.)',            description: 'ขนาดห้องชุดเป็นตารางเมตร (stock.size_sqm)',                  category: 'property', source: 'computed' },
  { key: 'ชั้น',                             label: 'ชั้น',                        description: 'ชั้นที่ของห้องชุด (stock.floor)',                            category: 'property', source: 'computed' },
  { key: 'ตึก',                              label: 'ตึก/อาคาร',                   description: 'ชื่อตึก (stock.building หรือ extra_vars)',                    category: 'property', source: 'computed_or_extra' },
  { key: 'ประเภทห้อง',                       label: 'ประเภทห้อง',                  description: 'ประเภทห้อง (Studio/1BR/2BR ฯลฯ)',                            category: 'property', source: 'computed' },
  { key: 'ประเภทห้องภาษาไทย',               label: 'ประเภทห้อง (ไทย)',             description: 'ชื่อประเภทห้องภาษาไทยเต็ม เช่น "1 ห้องนอน"',                category: 'property', source: 'computed' },
  { key: 'ประเภทห้องภาษาอังกฤษ',            label: 'ประเภทห้อง (อังกฤษ)',          description: 'ชื่อประเภทห้องภาษาอังกฤษ เช่น "1 Bedroom"',                  category: 'property', source: 'computed' },
  { key: 'ซอย',                              label: 'ซอย',                         description: 'ซอย (จาก extra_vars)',                                       category: 'property', source: 'extra_vars' },
  { key: 'ถนนโครงการ',                       label: 'ถนน (โครงการ)',               description: 'ถนนของโครงการ (projects.address_road)',                      category: 'property', source: 'computed_or_extra' },
  { key: 'thถนน',                            label: 'ถนน (โครงการ)',               description: 'Alias ของ <<ถนนโครงการ>>',                                   category: 'property', source: 'alias', aliasOf: 'ถนนโครงการ' },
  { key: 'แขวงตำบลห้องชุด',                 label: 'แขวง/ตำบล (โครงการ, ไทย)',    description: 'แขวง/ตำบลของโครงการ (projects.subdistrict)',                  category: 'property', source: 'computed_or_extra' },
  { key: 'thแขวงตำบล',                      label: 'แขวง/ตำบล (โครงการ, ไทย)',    description: 'Alias ของ <<แขวงตำบลห้องชุด>>',                              category: 'property', source: 'alias', aliasOf: 'แขวงตำบลห้องชุด' },
  { key: 'เขตอำเภอห้องชุด',                 label: 'เขต/อำเภอ (โครงการ, ไทย)',    description: 'เขต/อำเภอของโครงการ (projects.district)',                     category: 'property', source: 'computed_or_extra' },
  { key: 'thเขตอำเภอ',                      label: 'เขต/อำเภอ (โครงการ, ไทย)',    description: 'Alias ของ <<เขตอำเภอห้องชุด>>',                              category: 'property', source: 'alias', aliasOf: 'เขตอำเภอห้องชุด' },
  { key: 'จังหวัดห้องชุด',                  label: 'จังหวัด (โครงการ, ไทย)',       description: 'จังหวัดของโครงการ (projects.province)',                       category: 'property', source: 'computed_or_extra' },
  { key: 'thจังหวัด',                       label: 'จังหวัด (โครงการ, ไทย)',       description: 'Alias ของ <<จังหวัดห้องชุด>>',                               category: 'property', source: 'alias', aliasOf: 'จังหวัดห้องชุด' },
  { key: 'รหัสไปรษณีย์ห้องชุด',            label: 'รหัสไปรษณีย์ (โครงการ)',       description: 'รหัสไปรษณีย์ของโครงการ (projects.zip)',                       category: 'property', source: 'computed_or_extra' },
  { key: 'postcode',                         label: 'รหัสไปรษณีย์ (โครงการ)',       description: 'Alias ของ <<รหัสไปรษณีย์ห้องชุด>>',                         category: 'property', source: 'alias', aliasOf: 'รหัสไปรษณีย์ห้องชุด' },
  { key: 'enแขวงตำบล',                      label: 'แขวง/ตำบล (โครงการ, อังกฤษ)', description: 'แขวง/ตำบลโครงการ รูปแบบภาษาอังกฤษ',                         category: 'property', source: 'computed' },
  { key: 'แขวงตำบลโครงการภาษาอังกฤษ',       label: 'แขวง/ตำบล (โครงการ, อังกฤษ)', description: 'Alias ของ <<enแขวงตำบล>>',                                   category: 'property', source: 'alias', aliasOf: 'enแขวงตำบล' },
  { key: 'enเขตอำเภอ',                      label: 'เขต/อำเภอ (โครงการ, อังกฤษ)', description: 'เขต/อำเภอโครงการ รูปแบบภาษาอังกฤษ',                         category: 'property', source: 'computed' },
  { key: 'เขตอำเภอโครงการภาษาอังกฤษ',       label: 'เขต/อำเภอ (โครงการ, อังกฤษ)', description: 'Alias ของ <<enเขตอำเภอ>>',                                   category: 'property', source: 'alias', aliasOf: 'enเขตอำเภอ' },
  { key: 'enจังหวัด',                       label: 'จังหวัด (โครงการ, อังกฤษ)',   description: 'จังหวัดโครงการ รูปแบบภาษาอังกฤษ',                           category: 'property', source: 'computed' },
  { key: 'จังหวัดโครงการภาษาอังกฤษ',        label: 'จังหวัด (โครงการ, อังกฤษ)',   description: 'Alias ของ <<enจังหวัด>>',                                    category: 'property', source: 'alias', aliasOf: 'enจังหวัด' },

  // ─── OWNER ────────────────────────────────────────────────────────────────

  { key: 'ชื่อผู้ให้เช่า',                  label: 'ชื่อ-สกุลเจ้าของ (ไทย)',      description: 'ชื่อ-สกุลเต็มเจ้าของ ภาษาไทย (prefix + first + last)',       category: 'owner', source: 'computed' },
  { key: 'ชื่อ - สกุล เจ้าของ',            label: 'ชื่อ-สกุลเจ้าของ (ไทย)',      description: 'Alias ของ <<ชื่อผู้ให้เช่า>>',                               category: 'owner', source: 'alias', aliasOf: 'ชื่อผู้ให้เช่า' },
  { key: 'ชื่อผู้ให้เช่าภาษาอังกฤษ',       label: 'ชื่อ-สกุลเจ้าของ (อังกฤษ)',   description: 'ชื่อ-สกุลเจ้าของภาษาอังกฤษ (first_name_en + last_name_en)', category: 'owner', source: 'computed_or_extra' },
  { key: 'ฟอแมทบัตรประชาชนผู้ให้เช่า',     label: 'บัตรประชาชนเจ้าของ (เครื่องหมาย)', description: 'เลขบัตรประชาชนเจ้าของ พร้อมเครื่องหมาย -',           category: 'owner', source: 'computed' },
  { key: 'ผู้ให้เช่าบัตรประชาชนเลขที่',    label: 'บัตรประชาชนเจ้าของ (ตัวเลข)', description: 'เลขบัตรประชาชนเจ้าของ ตัวเลขล้วน 13 หลัก',                 category: 'owner', source: 'computed' },
  { key: 'เลขเสียภาษี เจ้าของ',           label: 'เลขเสียภาษีเจ้าของ',           description: 'เลขประจำตัวผู้เสียภาษีของเจ้าของ',                           category: 'owner', source: 'computed' },
  { key: 'บ้านเลขที่ เจ้าของ',            label: 'บ้านเลขที่เจ้าของ',            description: 'เลขที่บ้านของเจ้าของ',                                       category: 'owner', source: 'computed' },
  { key: 'หมู่ที่ เจ้าของ',               label: 'หมู่ที่เจ้าของ',               description: 'หมู่บ้านของเจ้าของ',                                         category: 'owner', source: 'computed_or_extra' },
  { key: 'ถนน เจ้าของ',                   label: 'ถนนเจ้าของ',                   description: 'ถนนที่อยู่เจ้าของ',                                           category: 'owner', source: 'computed' },
  { key: 'แขวงตำบล เจ้าของ',              label: 'แขวง/ตำบลเจ้าของ (ไทย)',       description: 'แขวง/ตำบลที่อยู่เจ้าของ',                                    category: 'owner', source: 'computed' },
  { key: 'เขตอำเภอ เจ้าของ',              label: 'เขต/อำเภอเจ้าของ (ไทย)',       description: 'เขต/อำเภอที่อยู่เจ้าของ',                                    category: 'owner', source: 'computed' },
  { key: 'จังหวัด เจ้าของ',               label: 'จังหวัดเจ้าของ (ไทย)',         description: 'จังหวัดที่อยู่เจ้าของ',                                      category: 'owner', source: 'computed' },
  { key: 'รหัสไปรษณีย์ เจ้าของ',          label: 'รหัสไปรษณีย์เจ้าของ',          description: 'รหัสไปรษณีย์ที่อยู่เจ้าของ',                                 category: 'owner', source: 'computed' },
  { key: 'enแขวงตำบล เจ้าของ',            label: 'แขวง/ตำบลเจ้าของ (อังกฤษ)',   description: 'แขวง/ตำบลที่อยู่เจ้าของ รูปแบบภาษาอังกฤษ',                  category: 'owner', source: 'computed' },
  { key: 'แขวงตำบลเจ้าของภาษาอังกฤษ',     label: 'แขวง/ตำบลเจ้าของ (อังกฤษ)',   description: 'Alias ของ <<enแขวงตำบล เจ้าของ>>',                           category: 'owner', source: 'alias', aliasOf: 'enแขวงตำบล เจ้าของ' },
  { key: 'enเขตอำเภอ เจ้าของ',            label: 'เขต/อำเภอเจ้าของ (อังกฤษ)',   description: 'เขต/อำเภอที่อยู่เจ้าของ รูปแบบภาษาอังกฤษ',                  category: 'owner', source: 'computed' },
  { key: 'เขตอำเภอเจ้าของภาษาอังกฤษ',     label: 'เขต/อำเภอเจ้าของ (อังกฤษ)',   description: 'Alias ของ <<enเขตอำเภอ เจ้าของ>>',                           category: 'owner', source: 'alias', aliasOf: 'enเขตอำเภอ เจ้าของ' },
  { key: 'enจังหวัด เจ้าของ',             label: 'จังหวัดเจ้าของ (อังกฤษ)',      description: 'จังหวัดที่อยู่เจ้าของ รูปแบบภาษาอังกฤษ',                    category: 'owner', source: 'computed' },
  { key: 'จังหวัดเจ้าของภาษาอังกฤษ',      label: 'จังหวัดเจ้าของ (อังกฤษ)',      description: 'Alias ของ <<enจังหวัด เจ้าของ>>',                            category: 'owner', source: 'alias', aliasOf: 'enจังหวัด เจ้าของ' },
  { key: 'บัญชีธนาคาร',                    label: 'ธนาคารเจ้าของ',               description: 'ชื่อธนาคารของเจ้าของ (หรือ agent ถ้าเจ้าของไม่ระบุ)',         category: 'owner', source: 'computed' },
  { key: 'บัญชีธนาคารภาษาอังกฤษ',          label: 'ธนาคารเจ้าของ (อังกฤษ)',      description: 'ชื่อธนาคารภาษาอังกฤษ (จาก extra_vars)',                      category: 'owner', source: 'extra_vars' },
  { key: 'เลขที่บัญชี',                    label: 'เลขที่บัญชีธนาคารเจ้าของ',    description: 'หมายเลขบัญชีธนาคารของเจ้าของ',                               category: 'owner', source: 'computed' },
  { key: 'เลขบัญชี',                       label: 'เลขที่บัญชีธนาคารเจ้าของ',    description: 'Alias ของ <<เลขที่บัญชี>>',                                  category: 'owner', source: 'alias', aliasOf: 'เลขที่บัญชี' },
  { key: 'ชื่อบัญชีธนาคาร',               label: 'ชื่อบัญชีธนาคารเจ้าของ',       description: 'ชื่อบัญชีธนาคารของเจ้าของ',                                  category: 'owner', source: 'computed' },
  { key: 'bankLogo',                        label: 'โลโก้ธนาคาร',                 description: 'Token โลโก้ธนาคาร ใช้ร่วมกับ inlineMd parser',                category: 'owner', source: 'computed' },

  // ─── TENANT ───────────────────────────────────────────────────────────────

  { key: 'ชื่อผู้เช่า',                    label: 'ชื่อ-สกุลผู้เช่า (ไทย)',       description: 'ชื่อ-สกุลเต็มผู้เช่า ภาษาไทย (prefix + first + last)',       category: 'tenant', source: 'computed' },
  { key: 'ชื่อ - สกุล ลูกค้า',            label: 'ชื่อ-สกุลผู้เช่า (ไทย)',       description: 'Alias ของ <<ชื่อผู้เช่า>>',                                  category: 'tenant', source: 'alias', aliasOf: 'ชื่อผู้เช่า' },
  { key: 'ชื่อผู้เช่าภาษาอังกฤษ',          label: 'ชื่อ-สกุลผู้เช่า (อังกฤษ)',   description: 'ชื่อ-สกุลผู้เช่าภาษาอังกฤษ (first_name_en + last_name_en)', category: 'tenant', source: 'computed_or_extra' },
  { key: 'ฟอแมทบัตรประชาชนผู้เช่า',        label: 'บัตรประชาชนผู้เช่า (เครื่องหมาย)', description: 'เลขบัตรประชาชนผู้เช่า พร้อมเครื่องหมาย -',           category: 'tenant', source: 'computed' },
  { key: 'ผู้เช่าบัตรประชาชนเลขที่',       label: 'บัตรประชาชนผู้เช่า (ตัวเลข)', description: 'เลขบัตรประชาชนผู้เช่า ตัวเลขล้วน 13 หลัก',                  category: 'tenant', source: 'computed' },
  { key: 'เลขเสียภาษี ลูกค้า',            label: 'เลขเสียภาษีผู้เช่า',           description: 'เลขประจำตัวผู้เสียภาษีของผู้เช่า',                           category: 'tenant', source: 'computed' },
  { key: 'บ้านเลขที่ ลูกค้า',             label: 'บ้านเลขที่ผู้เช่า',            description: 'เลขที่บ้านของผู้เช่า',                                       category: 'tenant', source: 'computed' },
  { key: 'หมู่ที่ ลูกค้า',                label: 'หมู่ที่ผู้เช่า',               description: 'หมู่บ้านของผู้เช่า',                                         category: 'tenant', source: 'computed_or_extra' },
  { key: 'ถนน ลูกค้า',                    label: 'ถนนผู้เช่า',                   description: 'ถนนที่อยู่ผู้เช่า',                                           category: 'tenant', source: 'computed' },
  { key: 'แขวงตำบล ลูกค้า',               label: 'แขวง/ตำบลผู้เช่า (ไทย)',       description: 'แขวง/ตำบลที่อยู่ผู้เช่า',                                    category: 'tenant', source: 'computed' },
  { key: 'เขตอำเภอ ลูกค้า',               label: 'เขต/อำเภอผู้เช่า (ไทย)',       description: 'เขต/อำเภอที่อยู่ผู้เช่า',                                    category: 'tenant', source: 'computed' },
  { key: 'จังหวัด ลูกค้า',                label: 'จังหวัดผู้เช่า (ไทย)',         description: 'จังหวัดที่อยู่ผู้เช่า',                                      category: 'tenant', source: 'computed' },
  { key: 'รหัสไปรษณีย์ ลูกค้า',           label: 'รหัสไปรษณีย์ผู้เช่า',          description: 'รหัสไปรษณีย์ที่อยู่ผู้เช่า',                                 category: 'tenant', source: 'computed' },
  { key: 'enแขวงตำบล ลูกค้า',             label: 'แขวง/ตำบลผู้เช่า (อังกฤษ)',   description: 'แขวง/ตำบลที่อยู่ผู้เช่า รูปแบบภาษาอังกฤษ',                  category: 'tenant', source: 'computed' },
  { key: 'แขวงตำบลลูกค้าภาษาอังกฤษ',       label: 'แขวง/ตำบลผู้เช่า (อังกฤษ)',   description: 'Alias ของ <<enแขวงตำบล ลูกค้า>>',                            category: 'tenant', source: 'alias', aliasOf: 'enแขวงตำบล ลูกค้า' },
  { key: 'enเขตอำเภอ ลูกค้า',             label: 'เขต/อำเภอผู้เช่า (อังกฤษ)',   description: 'เขต/อำเภอที่อยู่ผู้เช่า รูปแบบภาษาอังกฤษ',                  category: 'tenant', source: 'computed' },
  { key: 'เขตอำเภอลูกค้าภาษาอังกฤษ',       label: 'เขต/อำเภอผู้เช่า (อังกฤษ)',   description: 'Alias ของ <<enเขตอำเภอ ลูกค้า>>',                            category: 'tenant', source: 'alias', aliasOf: 'enเขตอำเภอ ลูกค้า' },
  { key: 'enจังหวัด ลูกค้า',              label: 'จังหวัดผู้เช่า (อังกฤษ)',      description: 'จังหวัดที่อยู่ผู้เช่า รูปแบบภาษาอังกฤษ',                    category: 'tenant', source: 'computed' },
  { key: 'จังหวัดลูกค้าภาษาอังกฤษ',        label: 'จังหวัดผู้เช่า (อังกฤษ)',      description: 'Alias ของ <<enจังหวัด ลูกค้า>>',                             category: 'tenant', source: 'alias', aliasOf: 'enจังหวัด ลูกค้า' },

  // ─── AGENT ────────────────────────────────────────────────────────────────

  { key: 'agent',                           label: 'ชื่อบริษัท/ตัวแทน',           description: 'ชื่อบริษัทหรือชื่อ agent (company_name ?? name)',             category: 'agent', source: 'computed' },
  { key: 'agent_name',                      label: 'ชื่อตัวแทน',                  description: 'ชื่อเต็ม agent (name ?? company_name)',                       category: 'agent', source: 'computed' },
  { key: 'agent_bank',                      label: 'ธนาคาร Agent',                description: 'ชื่อธนาคารของ agent',                                         category: 'agent', source: 'computed' },
  { key: 'agent_account_name',              label: 'ชื่อบัญชี Agent',             description: 'ชื่อบัญชีธนาคารของ agent',                                    category: 'agent', source: 'computed' },
  { key: 'agent_account_no',               label: 'เลขบัญชี Agent',               description: 'หมายเลขบัญชีธนาคารของ agent',                                 category: 'agent', source: 'computed' },

  // ─── FINANCIAL ────────────────────────────────────────────────────────────

  { key: 'ค่าเช่า',                         label: 'ค่าเช่ารายเดือน (ตัวเลข)',    description: 'ค่าเช่ารายเดือน พร้อม comma (rent_price)',                    category: 'financial', source: 'computed' },
  { key: 'ค่าเช่าเติมลูกน้ำ',               label: 'ค่าเช่ารายเดือน (ตัวเลข)',    description: 'Alias ของ <<ค่าเช่า>>',                                      category: 'financial', source: 'alias', aliasOf: 'ค่าเช่า' },
  { key: 'ค่าเช่าตัวอักษร',                 label: 'ค่าเช่ารายเดือน (ไทยอักษร)',  description: 'ค่าเช่าเขียนเป็นตัวอักษรภาษาไทย',                            category: 'financial', source: 'computed' },
  { key: 'ค่าเช่าบาท',                      label: 'ค่าเช่ารายเดือน (ไทยอักษร)',  description: 'Alias ของ <<ค่าเช่าตัวอักษร>>',                              category: 'financial', source: 'alias', aliasOf: 'ค่าเช่าตัวอักษร' },
  { key: 'ค่าเช่าภาษาอังกฤษ',               label: 'ค่าเช่ารายเดือน (อังกฤษอักษร)', description: 'ค่าเช่าเขียนเป็นตัวอักษรภาษาอังกฤษ',                   category: 'financial', source: 'computed' },
  { key: 'ค่าเช่าx3',                       label: 'ค่าเช่า × 3 (ตัวเลข)',        description: 'ค่าเช่า × 3 (เงินจอง + ประกัน + ล่วงหน้า)',                  category: 'financial', source: 'computed' },
  { key: 'ค่าเช่าx12เติมลูกน้ำ',            label: 'ค่าเช่า × 12 (ตัวเลข)',       description: 'ค่าเช่า × 12 (ค่าเช่าทั้งปี)',                               category: 'financial', source: 'computed' },
  { key: 'เงินจอง',                          label: 'เงินจอง (ตัวเลข)',            description: 'จำนวนเงินมัดจำการจอง (booking_amount)',                       category: 'financial', source: 'computed' },
  { key: 'booking_amount',                   label: 'เงินจอง (ตัวเลข)',            description: 'Alias ของ <<เงินจอง>>',                                      category: 'financial', source: 'alias', aliasOf: 'เงินจอง' },
  { key: 'เงินจองตัวอักษร',                  label: 'เงินจอง (ไทยอักษร)',          description: 'เงินจองเขียนเป็นตัวอักษรภาษาไทย',                            category: 'financial', source: 'computed' },
  { key: 'เงินจองภาษาอังกฤษ',                label: 'เงินจอง (อังกฤษอักษร)',       description: 'เงินจองเขียนเป็นตัวอักษรภาษาอังกฤษ',                         category: 'financial', source: 'computed' },
  { key: 'เงินประกันสัญญา',                  label: 'เงินประกันสัญญา (ตัวเลข)',    description: 'เงินประกันสัญญา (deposit_amount)',                             category: 'financial', source: 'computed' },
  { key: 'เงินประกันสัญญาตัวอักษร',          label: 'เงินประกันสัญญา (ไทยอักษร)', description: 'เงินประกันสัญญาเขียนเป็นตัวอักษรภาษาไทย',                    category: 'financial', source: 'computed' },
  { key: 'จำนวนเดือนเงินประกัน',             label: 'จำนวนเดือนประกัน',            description: 'จำนวนเดือนของเงินประกัน (deposit_months)',                    category: 'financial', source: 'computed' },
  { key: 'security_deposit',                 label: 'เงินประกัน (ตัวเลข, canonical)', description: 'เงินประกันสัญญา รูปแบบ canonical',                       category: 'financial', source: 'computed' },
  { key: 'security_deposit_months',          label: 'จำนวนเดือนประกัน (canonical)', description: 'จำนวนเดือนของเงินประกัน รูปแบบ canonical',                  category: 'financial', source: 'computed' },
  { key: 'จำนวนเงินวันทำสัญญา',             label: 'ยอดชำระวันทำสัญญา (ตัวเลข)',  description: 'ยอดชำระรวมวันทำสัญญา (deposit + rent − booking)',             category: 'financial', source: 'computed' },
  { key: 'จำนวนเงินวันทำสัญญาตัวอักษร',    label: 'ยอดชำระวันทำสัญญา (ไทยอักษร)', description: 'ยอดชำระวันทำสัญญาเขียนเป็นตัวอักษรภาษาไทย',              category: 'financial', source: 'computed' },
  { key: 'จำนวนเงินวันทำสัญญาภาษาอังกฤษ',  label: 'ยอดชำระวันทำสัญญา (อังกฤษอักษร)', description: 'ยอดชำระวันทำสัญญาเขียนเป็นตัวอักษรภาษาอังกฤษ',        category: 'financial', source: 'computed' },
  { key: 'ค่าปรับเติมลูกน้ำ',               label: 'ค่าปรับ (ตัวเลข)',             description: 'ค่าปรับสัญญา (penalty_amount)',                               category: 'financial', source: 'computed' },
  { key: 'ค่าปรับตัวอักษร',                 label: 'ค่าปรับ (ไทยอักษร)',           description: 'ค่าปรับเขียนเป็นตัวอักษรภาษาไทย',                            category: 'financial', source: 'computed' },
  { key: 'ค่าปรับตัวอักษรen',               label: 'ค่าปรับ (อังกฤษอักษร)',        description: 'ค่าปรับเขียนเป็นตัวอักษรภาษาอังกฤษ',                         category: 'financial', source: 'computed' },
  { key: 'จำนวนแอร์',                        label: 'จำนวนเครื่องแอร์',            description: 'จำนวนเครื่องแอร์ในห้อง (ac_count)',                           category: 'financial', source: 'computed' },
  { key: 'ค่าล้างแอร์เติมลูกน้ำ',           label: 'ค่าล้างแอร์ต่อเครื่อง (ตัวเลข)', description: 'ค่าล้างแอร์ต่อเครื่อง (ac_wash_per_unit)',               category: 'financial', source: 'computed' },
  { key: 'ค่าล้างแอร์ตัวอักษร',             label: 'ค่าล้างแอร์ต่อเครื่อง (ไทยอักษร)', description: 'ค่าล้างแอร์ต่อเครื่องเขียนเป็นตัวอักษรภาษาไทย',      category: 'financial', source: 'computed' },
  { key: 'ค่าล้างแอร์ตัวอักษรen',           label: 'ค่าล้างแอร์ต่อเครื่อง (อังกฤษอักษร)', description: 'ค่าล้างแอร์ต่อเครื่องเขียนเป็นตัวอักษรภาษาอังกฤษ', category: 'financial', source: 'computed' },
  { key: 'รวมค่าล้างแอร์เติมลูกน้ำ',        label: 'รวมค่าล้างแอร์ (ตัวเลข)',     description: 'ค่าล้างแอร์รวม (ac_count × ac_wash_per_unit)',                category: 'financial', source: 'computed' },
  { key: 'รวมแอร์เติมลูกน้ำ',               label: 'รวมค่าล้างแอร์ (ตัวเลข)',     description: 'Alias ของ <<รวมค่าล้างแอร์เติมลูกน้ำ>>',                    category: 'financial', source: 'alias', aliasOf: 'รวมค่าล้างแอร์เติมลูกน้ำ' },
  { key: 'รวมค่าล้างแอร์ตัวอักษร',          label: 'รวมค่าล้างแอร์ (ไทยอักษร)',   description: 'รวมค่าล้างแอร์เขียนเป็นตัวอักษรภาษาไทย',                    category: 'financial', source: 'computed' },
  { key: 'รวมค่าล้างแอร์ตัวอักษรen',        label: 'รวมค่าล้างแอร์ (อังกฤษอักษร)', description: 'รวมค่าล้างแอร์เขียนเป็นตัวอักษรภาษาอังกฤษ',                category: 'financial', source: 'computed' },
  { key: 'ค่าทำความสะอาดเติมลูกน้ำ',        label: 'ค่าทำความสะอาด (ตัวเลข)',      description: 'ค่าทำความสะอาด (cleaning_fee)',                               category: 'financial', source: 'computed' },
  { key: 'ค่าทำความสะอาดตัวอักษร',          label: 'ค่าทำความสะอาด (ไทยอักษร)',    description: 'ค่าทำความสะอาดเขียนเป็นตัวอักษรภาษาไทย',                    category: 'financial', source: 'computed' },
  { key: 'ค่าทำความสะอาดตัวอักษรen',        label: 'ค่าทำความสะอาด (อังกฤษอักษร)', description: 'ค่าทำความสะอาดเขียนเป็นตัวอักษรภาษาอังกฤษ',                category: 'financial', source: 'computed' },
  { key: 'รวมทำความสะอาดและล้างแอร์เติมลูกน้ำ', label: 'รวมทำความสะอาด+ล้างแอร์ (ตัวเลข)', description: 'cleaning_fee + total AC cleaning',               category: 'financial', source: 'computed' },
  { key: 'รวมทำความสะอาดและล้างแอร์ตัวอักษร',   label: 'รวมทำความสะอาด+ล้างแอร์ (ไทยอักษร)', description: 'รวมทำความสะอาดและล้างแอร์ ภาษาไทย',              category: 'financial', source: 'computed' },
  { key: 'รวมทำความสะอาดและล้างแอร์ตัวอักษรen', label: 'รวมทำความสะอาด+ล้างแอร์ (อังกฤษอักษร)', description: 'รวมทำความสะอาดและล้างแอร์ ภาษาอังกฤษ',        category: 'financial', source: 'computed' },
  { key: 'จำนวนผู้พักอาศัย',               label: 'จำนวนผู้พักอาศัย',             description: 'จำนวนผู้พักอาศัย (occupant_count)',                          category: 'financial', source: 'computed' },
  { key: 'รวมทคสอและลอเติมลูกน้ำ',          label: 'รวมทคส.+ค่าจอดรถ (ตัวเลข)',   description: 'common_fee + parking_fee',                                   category: 'financial', source: 'computed' },
  { key: 'รวมทคสอและลอตัวอักษร',            label: 'รวมทคส.+ค่าจอดรถ (ไทยอักษร)', description: 'common_fee + parking_fee เขียนเป็นตัวอักษรภาษาไทย',          category: 'financial', source: 'computed' },
  { key: 'ก่อนvat7',                        label: 'ยอดก่อน VAT (ตัวเลข)',         description: 'ยอดฐานก่อนคำนวณ VAT 7% (commission_net)',                    category: 'financial', source: 'computed' },
  { key: 'ก่อนvat72',                       label: 'ยอดก่อน VAT ชุด 2 (ตัวเลข)', description: 'Alias ของ <<ก่อนvat7>> สำหรับตัวแปรชุดที่ 2',                 category: 'financial', source: 'alias', aliasOf: 'ก่อนvat7' },
  { key: 'vat7',                             label: 'VAT 7% (ตัวเลข)',              description: 'จำนวน VAT 7%',                                               category: 'financial', source: 'computed' },
  { key: 'vat72',                            label: 'VAT 7% ชุด 2 (ตัวเลข)',       description: 'Alias ของ <<vat7>>',                                          category: 'financial', source: 'alias', aliasOf: 'vat7' },
  { key: 'หัก3',                             label: 'WHT 3% (ตัวเลข)',             description: 'จำนวนภาษีหัก ณ ที่จ่าย 3%',                                  category: 'financial', source: 'computed' },
  { key: 'หัก32',                            label: 'WHT 3% ชุด 2 (ตัวเลข)',       description: 'Alias ของ <<หัก3>>',                                          category: 'financial', source: 'alias', aliasOf: 'หัก3' },
  { key: 'ยอดรวมสุทธิ',                      label: 'ยอดรวมสุทธิ (ตัวเลข)',        description: 'ยอดสุทธิหลัง VAT และ WHT',                                    category: 'financial', source: 'computed' },
  { key: 'ยอดรวมสุทธิ2',                     label: 'ยอดรวมสุทธิ ชุด 2 (ตัวเลข)', description: 'Alias ของ <<ยอดรวมสุทธิ>>',                                   category: 'financial', source: 'alias', aliasOf: 'ยอดรวมสุทธิ' },
  { key: 'ยอดรวมสุทธิตัวอักษร',              label: 'ยอดรวมสุทธิ (ไทยอักษร)',      description: 'ยอดรวมสุทธิเขียนเป็นตัวอักษรภาษาไทย',                       category: 'financial', source: 'computed' },
  { key: 'ยอดรวมสุทธิตัวอักษร2',             label: 'ยอดรวมสุทธิ ชุด 2 (ไทยอักษร)', description: 'Alias ของ <<ยอดรวมสุทธิตัวอักษร>>',                       category: 'financial', source: 'alias', aliasOf: 'ยอดรวมสุทธิตัวอักษร' },
  { key: 'ยอดรวมสุทธิตัวอักษรen',            label: 'ยอดรวมสุทธิ (อังกฤษอักษร)',   description: 'ยอดรวมสุทธิเขียนเป็นตัวอักษรภาษาอังกฤษ',                    category: 'financial', source: 'computed' },
  { key: 'ยอดรวมสุทธิตัวอักษร2en',           label: 'ยอดรวมสุทธิ ชุด 2 (อังกฤษอักษร)', description: 'Alias ของ <<ยอดรวมสุทธิตัวอักษรen>>',                  category: 'financial', source: 'alias', aliasOf: 'ยอดรวมสุทธิตัวอักษรen' },
  { key: 'รวมหัก',                           label: 'รวม WHT หัก (ตัวเลข)',        description: 'รวมจำนวนภาษีหัก ณ ที่จ่าย',                                  category: 'financial', source: 'computed' },
  { key: 'รวมหักตัวอักษร',                   label: 'รวม WHT หัก (ไทยอักษร)',      description: 'รวม WHT เขียนเป็นตัวอักษรภาษาไทย',                          category: 'financial', source: 'computed' },
  { key: 'รวมหักตัวอักษรen',                 label: 'รวม WHT หัก (อังกฤษอักษร)',   description: 'รวม WHT เขียนเป็นตัวอักษรภาษาอังกฤษ',                       category: 'financial', source: 'computed' },
  { key: 'รายละเอียดใบแจ้งหนี้',             label: 'รายละเอียดใบแจ้งหนี้',         description: 'คำอธิบายรายการในใบแจ้งหนี้ (อัตโนมัติตาม doc_type)',         category: 'financial', source: 'computed_or_extra' },
  { key: 'วิธีชำระเงิน',                     label: 'วิธีชำระเงิน',                description: 'วิธีชำระเงิน (cash/transfer/cheque/credit)',                  category: 'financial', source: 'computed_or_extra' },

  // ─── COMMISSION ───────────────────────────────────────────────────────────

  { key: 'commission_from_owner',            label: 'ค่าคอมมิชชั่นจากเจ้าของ (ตัวเลข)', description: 'ค่าคอมมิชชั่นรับจากเจ้าของ (commission_from_owner)',    category: 'commission', source: 'computed' },
  { key: 'commission_from_owner_text',       label: 'ค่าคอมมิชชั่นจากเจ้าของ (ไทยอักษร)', description: 'ค่าคอมมิชชั่นจากเจ้าของเขียนเป็นตัวอักษรภาษาไทย', category: 'commission', source: 'computed' },
  { key: 'commission_from_owner_en',         label: 'ค่าคอมมิชชั่นจากเจ้าของ (อังกฤษอักษร)', description: 'ค่าคอมมิชชั่นจากเจ้าของเขียนเป็นตัวอักษรภาษาอังกฤษ', category: 'commission', source: 'computed' },
  { key: 'commission_from_customer',         label: 'ค่าคอมมิชชั่นจากผู้เช่า (ตัวเลข)', description: 'ค่าคอมมิชชั่นรับจากผู้เช่า (commission_from_customer)', category: 'commission', source: 'computed' },
  { key: 'commission_from_customer_text',    label: 'ค่าคอมมิชชั่นจากผู้เช่า (ไทยอักษร)', description: 'ค่าคอมมิชชั่นจากผู้เช่าเขียนเป็นตัวอักษรภาษาไทย', category: 'commission', source: 'computed' },
  { key: 'commission_net',                   label: 'ค่าคอมมิชชั่นสุทธิ (ตัวเลข)', description: 'ค่าคอมมิชชั่นสุทธิก่อนหัก (commission_net)',              category: 'commission', source: 'computed' },
  { key: 'commission_vat7',                  label: 'VAT 7% บนค่าคอมฯ (ตัวเลข)', description: 'VAT 7% คำนวณจาก commission_from_owner',                     category: 'commission', source: 'computed' },
  { key: 'commission_wht3',                  label: 'WHT 3% บนค่าคอมฯ (ตัวเลข)', description: 'WHT 3% คำนวณจาก commission_from_owner',                     category: 'commission', source: 'computed' },
  { key: 'commission_total',                 label: 'ค่าคอมมิชชั่นรวม (ตัวเลข)',  description: 'ค่าคอมมิชชั่นสุทธิหลัง VAT/WHT',                           category: 'commission', source: 'computed' },
  { key: 'commission_total_text',            label: 'ค่าคอมมิชชั่นรวม (ไทยอักษร)', description: 'ค่าคอมมิชชั่นรวมเขียนเป็นตัวอักษรภาษาไทย',               category: 'commission', source: 'computed' },
  { key: 'commission_total_en',              label: 'ค่าคอมมิชชั่นรวม (อังกฤษอักษร)', description: 'ค่าคอมมิชชั่นรวมเขียนเป็นตัวอักษรภาษาอังกฤษ',         category: 'commission', source: 'computed' },

  // ─── CO-AGENT ─────────────────────────────────────────────────────────────

  { key: 'ชื่อ',                             label: 'ชื่อ Co-Agent',               description: 'ชื่อเต็มของ Co-Agent (co_agent_info.ชื่อ)',                  category: 'co_agent', source: 'computed_or_extra' },
  { key: 'เลขเสียภาษี',                      label: 'เลขเสียภาษี Co-Agent',        description: 'เลขประจำตัวผู้เสียภาษีของ Co-Agent',                         category: 'co_agent', source: 'computed_or_extra' },
  { key: 'บ้านเลขที่',                       label: 'บ้านเลขที่ Co-Agent',          description: 'เลขที่บ้านของ Co-Agent',                                     category: 'co_agent', source: 'computed_or_extra' },
  { key: 'หมู่ที่',                          label: 'หมู่ที่ Co-Agent',             description: 'หมู่บ้านของ Co-Agent',                                       category: 'co_agent', source: 'computed_or_extra' },
  { key: 'ถนน',                              label: 'ถนน Co-Agent',                description: 'ถนนที่อยู่ Co-Agent',                                         category: 'co_agent', source: 'computed_or_extra' },
  { key: 'แขวงตำบล',                         label: 'แขวง/ตำบล Co-Agent',          description: 'แขวง/ตำบลที่อยู่ Co-Agent',                                  category: 'co_agent', source: 'computed_or_extra' },
  { key: 'เขตอำเภอ',                         label: 'เขต/อำเภอ Co-Agent',          description: 'เขต/อำเภอที่อยู่ Co-Agent',                                  category: 'co_agent', source: 'computed_or_extra' },
  { key: 'จังหวัด',                          label: 'จังหวัด Co-Agent',             description: 'จังหวัดที่อยู่ Co-Agent',                                    category: 'co_agent', source: 'computed_or_extra' },
  { key: 'บริษัท (ถ้ามี)',                  label: 'บริษัท Co-Agent',              description: 'ชื่อบริษัทของ Co-Agent (ถ้ามี)',                              category: 'co_agent', source: 'computed_or_extra' },
  { key: '/2',                               label: 'ค่าเช่า ÷ 2',                 description: 'ค่าเช่าหารสอง สำหรับแบ่งค่าคอมมิชชั่น',                      category: 'co_agent', source: 'computed' },
  { key: 'ธนาคาร Co-Agent',                 label: 'ธนาคาร Co-Agent',             description: 'ชื่อธนาคารของ Co-Agent',                                     category: 'co_agent', source: 'computed_or_extra' },
  { key: 'ชื่อบัญชี Co-Agent',              label: 'ชื่อบัญชี Co-Agent',           description: 'ชื่อบัญชีธนาคารของ Co-Agent',                                category: 'co_agent', source: 'computed_or_extra' },
  { key: 'เลขบัญชี Co-Agent',               label: 'เลขบัญชี Co-Agent',            description: 'หมายเลขบัญชีธนาคารของ Co-Agent',                             category: 'co_agent', source: 'computed_or_extra' },
  { key: 'คอมมิชชั่น%',                      label: 'อัตราค่าคอมมิชชั่น (%)',      description: 'เปอร์เซ็นต์ค่าคอมมิชชั่น (commission_rate_pct)',             category: 'co_agent', source: 'computed_or_extra' },
  { key: 'ค่าธรรมเนียม Co-Agent',           label: 'ค่าธรรมเนียม Co-Agent',        description: 'จำนวนเงินค่าธรรมเนียม Co-Agent',                             category: 'co_agent', source: 'computed_or_extra' },
  { key: 'ทิศทางชำระ',                       label: 'ทิศทางการชำระ Co-Agent',       description: 'ใครชำระให้ใคร (co_agent_payment_direction)',                  category: 'co_agent', source: 'computed_or_extra' },
  { key: 'ธนาคารผู้รับ',                     label: 'ธนาคารผู้รับชำระ',             description: 'ธนาคารของผู้รับชำระ (ขึ้นกับทิศทางชำระ)',                    category: 'co_agent', source: 'computed' },
  { key: 'ชื่อบัญชีผู้รับ',                 label: 'ชื่อบัญชีผู้รับชำระ',          description: 'ชื่อบัญชีของผู้รับชำระ',                                     category: 'co_agent', source: 'computed' },
  { key: 'เลขบัญชีผู้รับ',                  label: 'เลขบัญชีผู้รับชำระ',           description: 'หมายเลขบัญชีของผู้รับชำระ',                                  category: 'co_agent', source: 'computed_or_extra' },

  // ─── PAYMENT SCHEDULE ─────────────────────────────────────────────────────

  { key: '1',  label: 'เดือนที่ 1',  description: 'ชื่อเดือนไทย เดือนที่ 1 ของสัญญา',  category: 'payment_schedule', source: 'computed' },
  { key: '2',  label: 'เดือนที่ 2',  description: 'ชื่อเดือนไทย เดือนที่ 2 ของสัญญา',  category: 'payment_schedule', source: 'computed' },
  { key: '3',  label: 'เดือนที่ 3',  description: 'ชื่อเดือนไทย เดือนที่ 3 ของสัญญา',  category: 'payment_schedule', source: 'computed' },
  { key: '4',  label: 'เดือนที่ 4',  description: 'ชื่อเดือนไทย เดือนที่ 4 ของสัญญา',  category: 'payment_schedule', source: 'computed' },
  { key: '5',  label: 'เดือนที่ 5',  description: 'ชื่อเดือนไทย เดือนที่ 5 ของสัญญา',  category: 'payment_schedule', source: 'computed' },
  { key: '6',  label: 'เดือนที่ 6',  description: 'ชื่อเดือนไทย เดือนที่ 6 ของสัญญา',  category: 'payment_schedule', source: 'computed' },
  { key: '7',  label: 'เดือนที่ 7',  description: 'ชื่อเดือนไทย เดือนที่ 7 ของสัญญา',  category: 'payment_schedule', source: 'computed' },
  { key: '8',  label: 'เดือนที่ 8',  description: 'ชื่อเดือนไทย เดือนที่ 8 ของสัญญา',  category: 'payment_schedule', source: 'computed' },
  { key: '9',  label: 'เดือนที่ 9',  description: 'ชื่อเดือนไทย เดือนที่ 9 ของสัญญา',  category: 'payment_schedule', source: 'computed' },
  { key: '10', label: 'เดือนที่ 10', description: 'ชื่อเดือนไทย เดือนที่ 10 ของสัญญา', category: 'payment_schedule', source: 'computed' },
  { key: '11', label: 'เดือนที่ 11', description: 'ชื่อเดือนไทย เดือนที่ 11 ของสัญญา', category: 'payment_schedule', source: 'computed' },
  { key: '12', label: 'เดือนที่ 12', description: 'ชื่อเดือนไทย เดือนที่ 12 ของสัญญา', category: 'payment_schedule', source: 'computed' },
  { key: '1+5',  label: 'กำหนดชำระเดือน 1',  description: 'วัน+ผ่อนผัน + ชื่อเดือน เดือนที่ 1',  category: 'payment_schedule', source: 'computed' },
  { key: '2+5',  label: 'กำหนดชำระเดือน 2',  description: 'วัน+ผ่อนผัน + ชื่อเดือน เดือนที่ 2',  category: 'payment_schedule', source: 'computed' },
  { key: '3+5',  label: 'กำหนดชำระเดือน 3',  description: 'วัน+ผ่อนผัน + ชื่อเดือน เดือนที่ 3',  category: 'payment_schedule', source: 'computed' },
  { key: '4+5',  label: 'กำหนดชำระเดือน 4',  description: 'วัน+ผ่อนผัน + ชื่อเดือน เดือนที่ 4',  category: 'payment_schedule', source: 'computed' },
  { key: '5+5',  label: 'กำหนดชำระเดือน 5',  description: 'วัน+ผ่อนผัน + ชื่อเดือน เดือนที่ 5',  category: 'payment_schedule', source: 'computed' },
  { key: '6+5',  label: 'กำหนดชำระเดือน 6',  description: 'วัน+ผ่อนผัน + ชื่อเดือน เดือนที่ 6',  category: 'payment_schedule', source: 'computed' },
  { key: '7+5',  label: 'กำหนดชำระเดือน 7',  description: 'วัน+ผ่อนผัน + ชื่อเดือน เดือนที่ 7',  category: 'payment_schedule', source: 'computed' },
  { key: '8+5',  label: 'กำหนดชำระเดือน 8',  description: 'วัน+ผ่อนผัน + ชื่อเดือน เดือนที่ 8',  category: 'payment_schedule', source: 'computed' },
  { key: '9+5',  label: 'กำหนดชำระเดือน 9',  description: 'วัน+ผ่อนผัน + ชื่อเดือน เดือนที่ 9',  category: 'payment_schedule', source: 'computed' },
  { key: '10+5', label: 'กำหนดชำระเดือน 10', description: 'วัน+ผ่อนผัน + ชื่อเดือน เดือนที่ 10', category: 'payment_schedule', source: 'computed' },
  { key: '11+5', label: 'กำหนดชำระเดือน 11', description: 'วัน+ผ่อนผัน + ชื่อเดือน เดือนที่ 11', category: 'payment_schedule', source: 'computed' },
  { key: '12+5', label: 'กำหนดชำระเดือน 12', description: 'วัน+ผ่อนผัน + ชื่อเดือน เดือนที่ 12', category: 'payment_schedule', source: 'computed' },
  { key: 'ตารางชำระ',                        label: 'ตารางชำระเงินเต็ม',            description: 'แถว Markdown ตารางชำระค่าเช่าทั้งหมด (ขยายตาม contract_months)', category: 'payment_schedule', source: 'computed' },
  { key: 'รวมค่าเช่าทั้งหมด',               label: 'รวมค่าเช่าทั้งสัญญา (ตัวเลข)', description: 'ค่าเช่า × contract_months',                                  category: 'payment_schedule', source: 'computed' },

  // ─── NOTICE ───────────────────────────────────────────────────────────────

  { key: 'เหตุผล',                           label: 'เหตุผล',                      description: 'เหตุผลในหนังสือบอกกล่าว/เตือน (จาก extra_vars)',              category: 'notice', source: 'extra_vars' },
  { key: 'รายละเอียด',                       label: 'รายละเอียด',                  description: 'รายละเอียดเพิ่มเติม (จาก extra_vars)',                        category: 'notice', source: 'extra_vars' },
]

// Lookup map: key → definition (O(1) access)
export const VARIABLE_BY_KEY: Map<string, VariableDefinition> = new Map(
  DOCUMENT_VARIABLE_REGISTRY.map(v => [v.key, v])
)

// Keys grouped by category
export const VARIABLES_BY_CATEGORY: Record<VariableCategory, VariableDefinition[]> = (() => {
  const grouped = {} as Record<VariableCategory, VariableDefinition[]>
  for (const cat of Object.keys(CATEGORY_LABEL) as VariableCategory[]) {
    grouped[cat] = []
  }
  for (const v of DOCUMENT_VARIABLE_REGISTRY) {
    grouped[v.category].push(v)
  }
  return grouped
})()

// Canonical keys only (no aliases)
export const CANONICAL_VARIABLES = DOCUMENT_VARIABLE_REGISTRY.filter(v => v.source !== 'alias')

// Alias → canonical key map for documentation/migration purposes
export const ALIAS_TO_CANONICAL: Record<string, string> = Object.fromEntries(
  DOCUMENT_VARIABLE_REGISTRY
    .filter(v => v.source === 'alias' && v.aliasOf)
    .map(v => [v.key, v.aliasOf!])
)
