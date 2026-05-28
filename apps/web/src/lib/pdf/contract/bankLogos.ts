// Bank logo lookup for PDF rendering.
// Reads SVG files from public/banks/ and returns base64 data URLs.
// Called inline during rendering via {banklogo:NAME} in templates,
// or automatically via the <<bankLogo>> computed variable.

import path from 'path'
import fs from 'fs'

// All keys must be uppercase (lookup always uppercases + strips ธนาคาร prefix).
// Duplicate entries for abbreviations / English names / Thai full names are intentional.
const BANK_FILE: Record<string, string> = {
  // SCB — ไทยพาณิชย์
  'ไทยพาณิชย์':              'scb.svg',
  'ธนาคารไทยพาณิชย์':        'scb.svg',
  'SCB':                      'scb.svg',
  'SIAM COMMERCIAL BANK':     'scb.svg',
  // KBank — กสิกรไทย
  'กสิกรไทย':                 'kbank.svg',
  'ธนาคารกสิกรไทย':           'kbank.svg',
  'กสิกร':                    'kbank.svg',
  'KBANK':                    'kbank.svg',
  'KASIKORN':                 'kbank.svg',
  'KASIKORN BANK':            'kbank.svg',
  'KASIKORNBANK':             'kbank.svg',
  // BBL — กรุงเทพ
  'กรุงเทพ':                  'bbl.svg',
  'ธนาคารกรุงเทพ':            'bbl.svg',
  'BBL':                      'bbl.svg',
  'BANGKOK BANK':             'bbl.svg',
  // KTB — กรุงไทย
  'กรุงไทย':                  'ktb.svg',
  'ธนาคารกรุงไทย':            'ktb.svg',
  'KTB':                      'ktb.svg',
  'KRUNGTHAI':                'ktb.svg',
  'KRUNG THAI':               'ktb.svg',
  'KRUNG THAI BANK':          'ktb.svg',
  // TTB — ทหารไทยธนชาต (formerly TMB + Thanachart)
  'ทหารไทยธนชาต':             'ttb.svg',
  'ธนาคารทหารไทยธนชาต':       'ttb.svg',
  'ทหารไทย':                  'ttb.svg',
  'ธนชาต':                    'ttb.svg',
  'TTB':                      'ttb.svg',
  'TMB':                      'ttb.svg',
  'TMB THANACHART':           'ttb.svg',
  // BAY — กรุงศรีอยุธยา
  'กรุงศรี':                  'bay.svg',
  'กรุงศรีอยุธยา':            'bay.svg',
  'ธนาคารกรุงศรีอยุธยา':      'bay.svg',
  'BAY':                      'bay.svg',
  'KRUNGSRI':                 'bay.svg',
  'BANK OF AYUDHYA':          'bay.svg',
  // GSB — ออมสิน
  'ออมสิน':                   'gsb.svg',
  'ธนาคารออมสิน':             'gsb.svg',
  'GSB':                      'gsb.svg',
  'GOVERNMENT SAVINGS BANK':  'gsb.svg',
  // GHB — ธอส / อาคารสงเคราะห์
  'อาคารสงเคราะห์':            'ghb.svg',
  'ธนาคารอาคารสงเคราะห์':      'ghb.svg',
  'ธอส':                       'ghb.svg',
  'GHB':                       'ghb.svg',
  'GOVERNMENT HOUSING BANK':   'ghb.svg',
  // UOB — ยูโอบี
  'ยูโอบี':                   'uob.svg',
  'ธนาคารยูโอบี':             'uob.svg',
  'UOB':                      'uob.svg',
  'UNITED OVERSEAS BANK':     'uob.svg',
  // CIMB Thai
  'ซีไอเอ็มบี':               'cimb.svg',
  'ซีไอเอ็มบีไทย':            'cimb.svg',
  'ธนาคารซีไอเอ็มบีไทย':      'cimb.svg',
  'CIMB':                     'cimb.svg',
  'CIMB THAI':                'cimb.svg',
}

// Cache avoids repeated disk reads per request lifetime
const logoCache = new Map<string, string | null>()

function resolveFile(raw: string): string | undefined {
  // Try exact, then uppercase, then strip Thai ธนาคาร prefix + retry
  return (
    BANK_FILE[raw] ??
    BANK_FILE[raw.toUpperCase()] ??
    BANK_FILE[raw.replace(/^ธนาคาร/, '').trim()] ??
    BANK_FILE[raw.replace(/^ธนาคาร/, '').trim().toUpperCase()]
  )
}

export function getBankLogoDataUrl(bankName: string): string | null {
  const key = bankName.trim()
  if (logoCache.has(key)) return logoCache.get(key) ?? null

  const file = resolveFile(key)
  if (!file) {
    logoCache.set(key, null)
    return null
  }
  const p = path.join(process.cwd(), 'public', 'banks', file)
  if (!fs.existsSync(p)) {
    logoCache.set(key, null)
    return null
  }
  const buf = fs.readFileSync(p)
  const url = `data:image/svg+xml;base64,${buf.toString('base64')}`
  logoCache.set(key, url)
  return url
}
