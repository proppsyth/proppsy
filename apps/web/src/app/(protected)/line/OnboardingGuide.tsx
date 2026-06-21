'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, Copy, Check, ExternalLink, BookOpen } from 'lucide-react'

interface Props {
  webhookUrl: string
}

const STEPS: { title: string; detail: string[] }[] = [
  {
    title: 'สร้าง LINE Official Account (ถ้ายังไม่มี)',
    detail: [
      'เข้า LINE Official Account Manager แล้วสร้าง OA ของร้าน/ตัวเอง',
      'ถ้ามี OA อยู่แล้ว ข้ามไปขั้นถัดไปได้เลย',
    ],
  },
  {
    title: 'เปิด Messaging API ให้ OA',
    detail: [
      'ใน LINE Developers Console สร้าง Provider (ชื่ออะไรก็ได้ เช่น ชื่อร้าน)',
      'สร้าง Channel แบบ "Messaging API" แล้วเชื่อมกับ OA ของคุณ',
      'นี่คือขั้นที่สำคัญที่สุด — ทำครั้งเดียวจบ',
    ],
  },
  {
    title: 'คัดลอก Channel secret',
    detail: [
      'ที่แท็บ "Basic settings" จะมี Channel secret',
      'กดคัดลอกมาวางในช่อง "Channel secret" ด้านบนของหน้านี้',
    ],
  },
  {
    title: 'ออก & คัดลอก Channel access token',
    detail: [
      'ที่แท็บ "Messaging API" → หัวข้อ Channel access token (long-lived) → กด Issue',
      'คัดลอก token มาวางในช่อง "Channel access token" ด้านบน',
    ],
  },
  {
    title: 'ตั้ง Response mode = "Bot" (สำคัญที่สุด!)',
    detail: [
      'ที่ LINE Official Account Manager → ตั้งค่า → การตอบกลับ (Response settings)',
      'เลือก Response mode = "Bot" (ห้ามเป็น "Chat") — ถ้าเป็น Chat ระบบจะไม่ได้รับสัญญาณเลย',
      'ปิด "Auto-reply messages" และ "Greeting messages" เพื่อไม่ให้บอทตอบรก',
    ],
  },
  {
    title: 'เปิดให้บอทเข้ากลุ่มได้',
    detail: [
      'ที่แท็บ Messaging API → เปิด "Allow bot to join group chats"',
    ],
  },
  {
    title: 'ใส่ Webhook URL + เปิด Use webhook (เพื่อให้ระบบจับกลุ่มอัตโนมัติ)',
    detail: [
      'ที่แท็บ Messaging API → Webhook URL → วาง URL ด้านล่างนี้ → กด Update',
      'เปิดสวิตช์ "Use webhook" ให้เป็นสีเขียว แล้วกด "Verify" เพื่อทดสอบ (ควรขึ้น Success)',
    ],
  },
  {
    title: 'กลับมากด "เชื่อมต่อ & ทดสอบ" ที่หน้านี้',
    detail: [
      'เมื่อขึ้น ✓ เขียว แปลว่าพร้อมใช้งานแล้ว',
      'จากนั้นแค่เพิ่ม OA ของคุณเข้ากลุ่มลูกค้า → ระบบจะจับกลุ่มให้เอง',
    ],
  },
]

export default function OnboardingGuide({ webhookUrl }: Props) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  function copyWebhook() {
    navigator.clipboard.writeText(webhookUrl).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <button onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition">
        <span className="flex items-center gap-2 text-sm font-semibold text-gray-800">
          <BookOpen className="w-4 h-4 text-blue-600" />
          คู่มือเชื่อมต่อครั้งแรก (ทำครั้งเดียว)
        </span>
        {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-4 border-t border-gray-100 pt-3">
          <a href="https://developers.line.biz/console/" target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:underline">
            เปิด LINE Developers Console <ExternalLink className="w-3.5 h-3.5" />
          </a>

          <ol className="space-y-3">
            {STEPS.map((s, i) => (
              <li key={i} className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center">
                  {i + 1}
                </span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-800">{s.title}</p>
                  <ul className="mt-1 space-y-0.5">
                    {s.detail.map((d, j) => (
                      <li key={j} className="text-xs text-gray-500 leading-relaxed">• {d}</li>
                    ))}
                  </ul>
                  {/* Webhook URL helper appears under the "Webhook URL" step */}
                  {s.title.startsWith('ใส่ Webhook URL') && (
                    <div className="mt-2 flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-2">
                      <code className="flex-1 text-xs text-gray-700 break-all">{webhookUrl}</code>
                      <button onClick={copyWebhook}
                        className="flex-shrink-0 flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800">
                        {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        {copied ? 'คัดลอกแล้ว' : 'คัดลอก'}
                      </button>
                    </div>
                  )}
                  {/* Placeholder for the screenshot you'll add later */}
                  <div className="mt-2 h-px" data-screenshot-slot={i + 1} />
                </div>
              </li>
            ))}
          </ol>

          <p className="text-xs text-gray-400 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
            💡 ขั้นตอนนี้ทำครั้งเดียวต่อบัญชี หลังจากนั้นการใช้งานประจำเหลือแค่ &ldquo;ลากบอทเข้ากลุ่ม&rdquo; เท่านั้น
          </p>
        </div>
      )}
    </div>
  )
}
