// Shared Gemini vision OCR — call only from server-side code
import { normalizeAddressFields } from '@/lib/address'

export type OcrDocumentResult = {
  doc_type?: 'id_card' | 'passport' | null
  prefix?: string | null
  first_name_th?: string | null
  last_name_th?: string | null
  first_name_en?: string | null
  last_name_en?: string | null
  national_id?: string | null
  nationality?: string | null
  gender?: string | null
  birth_date?: string | null
  expiry_date?: string | null
  address_no?: string | null
  moo?: string | null
  address_road?: string | null
  province?: string | null
  district?: string | null
  subdistrict?: string | null
  zip?: string | null
}

export type BankBookOcrResult = {
  bank_name?: string | null
  bank_account_name?: string | null
  bank_account_no?: string | null
}

const DOCUMENT_PROMPT = `วิเคราะห์เอกสารนี้ว่าเป็นบัตรประชาชนไทยหรือพาสปอร์ต แล้วส่งคืน JSON เท่านั้น ไม่ต้องมีคำอธิบาย:

{
  "doc_type": "id_card หรือ passport",
  "prefix": "คำนำหน้า — ใช้ นาย / นาง / นางสาว / Mr. / Mrs. / Ms. เท่านั้น (ห้ามใช้ น.ส.) หรือ null",
  "first_name_th": "ชื่อภาษาไทย หรือ null",
  "last_name_th": "นามสกุลภาษาไทย หรือ null",
  "first_name_en": "ชื่อภาษาอังกฤษ (Given name) หรือ null",
  "last_name_en": "นามสกุลภาษาอังกฤษ (Surname) หรือ null",
  "national_id": "เลขบัตรประชาชน 13 หลัก (กรณีบัตรประชาชน) หรือเลขพาสปอร์ต (กรณีพาสปอร์ต) หรือ null",
  "nationality": "สัญชาติเป็นภาษาอังกฤษ (กรณีพาสปอร์ต เช่น THAI, CHINESE) หรือ null",
  "gender": "M หรือ F (กรณีพาสปอร์ต) หรือ null",
  "birth_date": "วันเกิด รูปแบบ DD MMM YYYY (เช่น 01 JAN 1990) หรือ null",
  "expiry_date": "วันหมดอายุ รูปแบบ DD MMM YYYY หรือ null",
  "address_no": "บ้านเลขที่ (กรณีบัตรประชาชน) หรือ null",
  "moo": "หมู่ที่ (กรณีบัตรประชาชน) หรือ null",
  "address_road": "ถนน/ซอย (กรณีบัตรประชาชน) หรือ null",
  "province": "จังหวัด (กรณีบัตรประชาชน) หรือ null",
  "district": "อำเภอ/เขต (กรณีบัตรประชาชน) หรือ null",
  "subdistrict": "ตำบล/แขวง (กรณีบัตรประชาชน) หรือ null",
  "zip": "รหัสไปรษณีย์ (กรณีบัตรประชาชน) หรือ null"
}`

const BANK_BOOK_PROMPT = `วิเคราะห์หน้าแรกของสมุดบัญชีธนาคารหรือหลักฐานบัญชีธนาคารนี้ แล้วส่งคืน JSON เท่านั้น ไม่ต้องมีคำอธิบาย:

{
  "bank_name": "ชื่อธนาคารเต็มภาษาไทย (เช่น ธนาคารกสิกรไทย, ธนาคารไทยพาณิชย์) หรือ null",
  "bank_account_name": "ชื่อเจ้าของบัญชี หรือ null",
  "bank_account_no": "เลขที่บัญชี (รวมขีดถ้ามี เช่น xxx-x-xxxxx-x) หรือ null"
}`

async function callGemini(
  apiKey: string,
  base64: string,
  mimeType: string,
  prompt: string,
): Promise<string> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { inlineData: { mimeType, data: base64 } },
            { text: prompt },
          ],
        }],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: 'application/json',
        },
      }),
    }
  )
  if (!res.ok) throw new Error(`Gemini API error ${res.status}`)
  const data = await res.json()
  const text: string = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
  return text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
}

export async function geminiParseDocument(
  base64: string,
  mimeType: string,
  apiKey: string,
): Promise<OcrDocumentResult> {
  const cleaned = await callGemini(apiKey, base64, mimeType, DOCUMENT_PROMPT)
  const raw = JSON.parse(cleaned || '{}') as OcrDocumentResult

  // Normalize prefix: น.ส. → นางสาว (OCR sometimes returns abbreviation)
  if (raw.prefix === 'น.ส.' || raw.prefix === 'นางสาว') raw.prefix = 'นางสาว'

  // Normalize address fields from OCR to canonical Thai + derive zip
  if (raw.province || raw.district || raw.subdistrict) {
    const norm = normalizeAddressFields({
      province: raw.province ?? undefined,
      district: raw.district ?? undefined,
      subdistrict: raw.subdistrict ?? undefined,
    })
    if (norm) {
      raw.province = norm.province_th
      raw.district = norm.district_th
      raw.subdistrict = norm.subdistrict_th
      if (!raw.zip) raw.zip = norm.zip
    }
  }

  return raw
}

export async function geminiParseBankBook(
  base64: string,
  mimeType: string,
  apiKey: string,
): Promise<BankBookOcrResult> {
  const cleaned = await callGemini(apiKey, base64, mimeType, BANK_BOOK_PROMPT)
  return JSON.parse(cleaned || '{}') as BankBookOcrResult
}
