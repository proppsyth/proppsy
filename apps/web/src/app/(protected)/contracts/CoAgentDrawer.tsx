'use client'

import { X, Users } from 'lucide-react'
import { CoAgentForm, type CoAgent } from '@/app/(protected)/co-agents/CoAgentManager'

interface Props {
  onCreated: (id: string, label: string) => void
  onClose: () => void
}

export default function CoAgentDrawer({ onCreated, onClose }: Props) {
  function handleSaved(agent: CoAgent) {
    const label = [agent.prefix_th, agent.first_name_th, agent.last_name_th].filter(Boolean).join(' ')
    onCreated(agent.id, label)
  }

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col bg-white">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 flex-shrink-0 bg-white">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-blue-600" />
          <h2 className="text-base font-bold text-gray-900">เพิ่ม Co-Agent ใหม่</h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <CoAgentForm editingAgent={null} onSaved={handleSaved} onCancel={onClose} />
      </div>
    </div>
  )
}
