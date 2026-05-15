'use client'

import { Phone, MessageCircle, Building2, Users } from 'lucide-react'
import Image from 'next/image'

interface Agent {
  name?: string
  nickname?: string
  email?: string
  phone?: string
  line_id?: string
  logo_url?: string
  company_name?: string
  team_name?: string
  first_name_th?: string
  last_name_th?: string
  position?: string
}

interface Props {
  agent: Agent | null
  stockId: string
}

export default function ContactCard({ agent, stockId }: Props) {
  const displayName = agent?.nickname
    || [agent?.first_name_th, agent?.last_name_th].filter(Boolean).join(' ')
    || agent?.name
    || null

  const initials = displayName?.charAt(0)?.toUpperCase() ?? 'A'

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden sticky top-20">
      <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/70">
        <h2 className="text-sm font-semibold text-gray-700">ติดต่อตัวแทน</h2>
      </div>
      <div className="p-4 space-y-3">
        {/* Agent identity */}
        <div className="flex items-center gap-3">
          {agent?.logo_url ? (
            <div className="w-12 h-12 rounded-full overflow-hidden border border-gray-100 flex-shrink-0">
              <Image src={agent.logo_url} alt={displayName ?? 'agent'} width={48} height={48} className="object-cover w-full h-full" />
            </div>
          ) : (
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-bold text-lg flex-shrink-0">
              {initials}
            </div>
          )}
          <div className="min-w-0 flex-1">
            {displayName && (
              <p className="text-sm font-semibold text-gray-900 truncate">{displayName}</p>
            )}
            {agent?.position && (
              <p className="text-xs text-gray-500 truncate">{agent.position}</p>
            )}
          </div>
        </div>

        {/* Company / Team */}
        {(agent?.company_name || agent?.team_name) && (
          <div className="space-y-1.5">
            {agent.company_name && (
              <div className="flex items-center gap-2 text-xs text-gray-600">
                <Building2 className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                <span className="truncate">{agent.company_name}</span>
              </div>
            )}
            {agent.team_name && (
              <div className="flex items-center gap-2 text-xs text-gray-600">
                <Users className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                <span className="truncate">{agent.team_name}</span>
              </div>
            )}
          </div>
        )}

        {/* Contact buttons */}
        <div className="space-y-2 pt-1">
          {agent?.phone && (
            <a
              href={`tel:${agent.phone}`}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-semibold rounded-xl transition"
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
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-500 hover:bg-green-600 active:bg-green-700 text-white text-sm font-semibold rounded-xl transition"
            >
              <MessageCircle className="w-4 h-4" />
              LINE: {agent.line_id}
            </a>
          )}
          {!agent?.phone && !agent?.line_id && agent?.email && (
            <a
              href={`mailto:${agent.email}`}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold rounded-xl transition"
            >
              ติดต่อทางอีเมล
            </a>
          )}
        </div>

        <p className="text-xs text-center text-gray-400">รหัสทรัพย์: {stockId}</p>
      </div>
    </div>
  )
}
