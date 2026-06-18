import {
  PenLine, X, CalendarClock, AlertTriangle, CircleAlert, Home,
  Eye, Flame, Rocket, ClipboardList, FileText, RefreshCw, Bell,
  type LucideIcon,
} from 'lucide-react'

const NOTIFICATION_LUCIDE: Record<string, LucideIcon> = {
  owner_signed:        PenLine,
  tenant_signed:       PenLine,
  coagent_signed:      PenLine,
  document_rejected:   X,
  contract_expiry_90:  CalendarClock,
  contract_expiry_60:  AlertTriangle,
  contract_expiry_30:  AlertTriangle,
  contract_expiry_7:   CircleAlert,
  lease_expiry_30:     Home,
  lease_expiry_7:      CircleAlert,
  listing_views_100:   Eye,
  listing_views_500:   Flame,
  listing_views_1000:  Rocket,
  booking_created:     ClipboardList,
  lease_created:       FileText,
  renewal_created:     RefreshCw,
}

// Neutral, monochrome notification icon (no emoji).
export default function NotificationIcon({
  type,
  className = 'w-4 h-4 text-gray-500',
}: {
  type: string
  className?: string
}) {
  const Icon = NOTIFICATION_LUCIDE[type] ?? Bell
  return <Icon className={className} />
}
