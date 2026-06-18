import {
  Plus, Pencil, Globe, Lock, PenLine, Eye, Send, X, Tag,
  Home, Building2, User, ClipboardList, FileText, RefreshCw,
  Receipt, Wallet, Handshake, Circle, type LucideIcon,
} from 'lucide-react'
import type { EntityType } from '@/lib/activity/log'

const ACTION_ICON: Record<string, LucideIcon> = {
  created:     Plus,
  updated:     Pencil,
  published:   Globe,
  unpublished: Lock,
  signed:      PenLine,
  opened:      Eye,
  sent:        Send,
  cancelled:   X,
  alias_added: Tag,
}

const ENTITY_ICON: Record<EntityType, LucideIcon> = {
  stock:       Home,
  project:     Building2,
  owner:       User,
  tenant:      User,
  booking:     ClipboardList,
  lease:       FileText,
  renewal:     RefreshCw,
  termination: FileText,
  esign:       PenLine,
  invoice:     Receipt,
  receipt:     Receipt,
  commission:  Wallet,
  coagent:     Handshake,
}

// Neutral, monochrome activity icon (no emoji / loud colors).
export default function ActivityIcon({
  action,
  entityType,
  className = 'w-4 h-4 text-gray-500',
}: {
  action: string
  entityType: EntityType
  className?: string
}) {
  const Icon = ACTION_ICON[action] ?? ENTITY_ICON[entityType] ?? Circle
  return <Icon className={className} />
}
