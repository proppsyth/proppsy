'use client'

import { useState } from 'react'
import { Phone, MessageCircle, ChevronDown } from 'lucide-react'

interface Agent {
  name?: string
  phone?: string
  line_id?: string
  logo_url?: string
}

interface Props {
  agent: Agent | null
  stockId: string
}

export default function ContactCard({ agent, stockId }: Props) {
  const [revealed, setRevealed] = useState(false)

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden sticky top-20">
      <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/70">
        <h2 className="text-sm font-semibold text-gray-700">ติดต่อสอบถาม</h2>
      </div>
      <div className="p-4 space-y-3">
        {agent?.name && (
          <p className="text-sm text-gray-600">
            ดูแลโดย <span className="font-medium text-gray-900">{agent.name}</span>
          </p>
        )}

        {!revealed ? (
          <button
            onClick={() => setRevealed(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition"
          >
            <ChevronDown className="w-4 h-4" />
            แสดงข้อมูลติดต่อ
          </button>
        ) : (
          <div className="space-y-2">
            {agent?.phone && (
              <a
                href={`tel:${agent.phone}`}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition"
              >
                <Phone className="w-4 h-4" />
                {agent.phone}
              </a>
            )}
            {agent?.line_id && (
              <a
                href={`https://line.me/ti/p/~${agent.line_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-500 hover:bg-green-600 text-white text-sm font-semibold rounded-xl transition"
              >
                <MessageCircle className="w-4 h-4" />
                LINE: {agent.line_id}
              </a>
            )}
            {!agent?.phone && !agent?.line_id && (
              <p className="text-xs text-center text-gray-400 py-2">
                กรุณาติดต่อผ่านทางอีเมล proppsyth@gmail.com
              </p>
            )}
          </div>
        )}

        <p className="text-xs text-center text-gray-400">รหัสทรัพย์: {stockId}</p>
      </div>
    </div>
  )
}
