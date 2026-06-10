export type NotificationType =
  // Documents — e-signature events
  | 'owner_signed'
  | 'tenant_signed'
  | 'coagent_signed'
  | 'document_rejected'
  // Contracts — expiry warnings
  | 'contract_expiry_90'
  | 'contract_expiry_60'
  | 'contract_expiry_30'
  | 'contract_expiry_7'
  // Listings — view milestones
  | 'listing_views_100'
  | 'listing_views_500'
  | 'listing_views_1000'
  // Workflow — document lifecycle
  | 'booking_created'
  | 'lease_created'
  | 'renewal_created'

export interface AppNotification {
  id: string
  user_id: string
  type: NotificationType | string
  title: string
  message: string
  url: string | null
  is_read: boolean
  created_at: string
}

export interface NotifyInput {
  user_id: string
  type: NotificationType
  title: string
  message: string
  url?: string | null
}

export const NOTIFICATION_ICON: Record<string, string> = {
  owner_signed:        '✍️',
  tenant_signed:       '✍️',
  coagent_signed:      '✍️',
  document_rejected:   '❌',
  contract_expiry_90:  '📅',
  contract_expiry_60:  '⚠️',
  contract_expiry_30:  '⚠️',
  contract_expiry_7:   '🔴',
  listing_views_100:   '👁️',
  listing_views_500:   '🔥',
  listing_views_1000:  '🚀',
  booking_created:     '📋',
  lease_created:       '📄',
  renewal_created:     '🔄',
}
