'use client'

import Link from 'next/link'
import { Phone, MessageCircle, Building2, Users, ArrowRight } from 'lucide-react'
import AgentAvatar from '@/components/shared/AgentAvatar'

interface Agent {
  name?: string
  nickname?: string
  email?: string
  phone?: string
  line_id?: string
  logo_url?: string
  avatar_url?: string
  company_name?: string
  team_name?: string
  first_name_th?: string
  last_name_th?: string
  position?: string
  public_slug?: string
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

  const avatarUrl = agent?.avatar_url || agent?.logo_url

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/70">
        <h2 className="text-sm font-semibold text-gray-700">ติดต่อตัวแทน</h2>
      </div>
      <div className="p-4 space-y-3">
        {/* Agent identity */}
        <div className="flex items-center gap-3">
          <AgentAvatar url={avatarUrl} name={displayName} size="md" />
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

        {/* Agent profile link */}
        {agent?.public_slug && (
          <Link
            href={`/agent/${agent.public_slug}`}
            className="flex items-center justify-center gap-1.5 w-full py-2 text-xs text-blue-600 hover:text-blue-700 border border-blue-100 hover:border-blue-200 rounded-xl transition bg-blue-50/50 hover:bg-blue-50"
          >
            ดูประกาศอื่นจากเอเจนต์นี้
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        )}

        <p className="text-xs text-center text-gray-400">รหัสทรัพย์: {stockId}</p>
      </div>
    </div>
  )
}
