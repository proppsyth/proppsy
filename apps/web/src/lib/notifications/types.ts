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
  // Stock lease end date warnings
  | 'lease_expiry_30'
  | 'lease_expiry_7'
  // Listings — view milestones
  | 'listing_views_100'
  | 'listing_views_500'
  | 'listing_views_1000'
  // Workflow — document lifecycle
  | 'booking_created'
  | 'lease_created'
  | 'renewal_created'
  // Leads & e-sign activity
  | 'inquiry'
  | 'esign_viewed'
  | 'esign_signed'
  // Credits & AI
  | 'credit_spent'
  | 'ai_used'
  | 'admin_credit_granted'
  | 'admin_plan_changed'
  | 'plan_expiring'
  // Calendar / appointments
  | 'appointment_today'
  // LINE rent reminder summary
  | 'rent_reminder_sent'
  // Listing view milestones
  | 'listing_views_10'
  // System / admin broadcast (always delivered)
  | 'announcement'

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
  lease_expiry_30:     '🏠',
  lease_expiry_7:      '🔴',
  listing_views_100:   '👁️',
  listing_views_500:   '🔥',
  listing_views_1000:  '🚀',
  booking_created:     '📋',
  lease_created:       '📄',
  renewal_created:     '🔄',
}
