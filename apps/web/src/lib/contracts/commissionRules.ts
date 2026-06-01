/**
 * Proppsy Commission Business Rules
 *
 * Commission is considered RECEIVED on the lease signing date (move_in_date),
 * not on the reservation/booking date.
 *
 * Standard rate table:
 *  ≤ 6 months   → 0.5× monthly rent
 *  ≤ 12 months  → 1.0× monthly rent
 *  ≤ 24 months  → 1.5× monthly rent
 *  > 24 months  → 2.0× monthly rent
 */

// ─── Rate Table ───────────────────────────────────────────────

export interface CommissionBracket {
  /** Inclusive minimum contract term in months. */
  minMonths: number
  /** Inclusive maximum contract term in months. */
  maxMonths: number
  /** Multiplier applied to monthly rent (e.g. 0.5 = half a month). */
  multiplier: number
  /** Human-readable Thai label for this bracket. */
  labelTh: string
}

export const COMMISSION_RATE_TABLE: CommissionBracket[] = [
  { minMonths: 1,  maxMonths: 6,        multiplier: 0.5, labelTh: '≤ 6 เดือน → 0.5 เดือน' },
  { minMonths: 7,  maxMonths: 12,       multiplier: 1.0, labelTh: '≤ 12 เดือน → 1 เดือน' },
  { minMonths: 13, maxMonths: 24,       multiplier: 1.5, labelTh: '≤ 24 เดือน → 1.5 เดือน' },
  { minMonths: 25, maxMonths: Infinity, multiplier: 2.0, labelTh: '> 24 เดือน → 2 เดือน' },
]

// ─── Core Helpers ─────────────────────────────────────────────

/**
 * Returns the commission multiplier (in months of rent) for a given contract term.
 * Falls back to 1.0× if term is outside the rate table (should not happen in practice).
 */
export function getCommissionMultiplier(contractTermMonths: number): number {
  for (const b of COMMISSION_RATE_TABLE) {
    if (contractTermMonths >= b.minMonths && contractTermMonths <= b.maxMonths) {
      return b.multiplier
    }
  }
  return 1.0
}

export interface CommissionResult {
  /** Number of months' rent (e.g. 0.5, 1, 1.5, 2). */
  commission_months: number
  /** Baht amount = commission_months × monthlyRent, rounded to nearest integer. */
  commission_amount: number
}

/**
 * Calculate commission from contract term and monthly rent.
 *
 * @example
 * calculateCommission(12, 20_000)  // → { commission_months: 1, commission_amount: 20000 }
 * calculateCommission(6,  20_000)  // → { commission_months: 0.5, commission_amount: 10000 }
 * calculateCommission(24, 20_000)  // → { commission_months: 1.5, commission_amount: 30000 }
 * calculateCommission(36, 20_000)  // → { commission_months: 2, commission_amount: 40000 }
 */
export function calculateCommission(
  contractTermMonths: number,
  monthlyRent: number,
): CommissionResult {
  const multiplier = getCommissionMultiplier(contractTermMonths)
  return {
    commission_months: multiplier,
    commission_amount: Math.round(monthlyRent * multiplier),
  }
}

/**
 * Returns a short Thai hint string describing the commission calculation.
 * Intended for UI display next to the commission field.
 *
 * @example
 * commissionHint(12, 20000) // "สัญญา 12 เดือน → ×1 เดือน = ฿20,000"
 */
export function commissionHint(contractTermMonths: number, monthlyRent: number): string {
  if (!contractTermMonths || !monthlyRent) return ''
  const { commission_months, commission_amount } = calculateCommission(contractTermMonths, monthlyRent)
  const formatted = new Intl.NumberFormat('th-TH').format(commission_amount)
  return `สัญญา ${contractTermMonths} เดือน → ×${commission_months} เดือน = ฿${formatted}`
}

// ─── Commission Split ─────────────────────────────────────────

export interface CommissionSplitResult {
  /** Amount we keep after paying the co-agent (THB). */
  our_amount: number
  /** Amount paid to the co-agent (THB). */
  co_agent_amount: number
}

/**
 * Split total commission between us and a co-agent.
 * splitPercent is the co-agent's share (e.g. 50 means 50% to co-agent).
 *
 * @example
 * calculateCommissionSplit(20000, 50)
 * // → { our_amount: 10000, co_agent_amount: 10000 }
 */
export function calculateCommissionSplit(
  totalCommission: number,
  splitPercent: number,
): CommissionSplitResult {
  const coAgentAmount = Math.round(totalCommission * splitPercent / 100)
  return {
    our_amount: totalCommission - coAgentAmount,
    co_agent_amount: coAgentAmount,
  }
}

// ─── Deposit Constants ────────────────────────────────────────

/**
 * Standard deposit rules:
 * - Security Deposit (เงินประกัน) for a lease = 2 months' rent by default.
 * - Booking Deposit (เงินจอง / ค่ามัดจำ) for a reservation = 1 month's rent.
 */
export const DEPOSIT_DEFAULTS = {
  /** เงินประกัน — security deposit for a lease contract. */
  leaseDepositMonths: 2,
  /** เงินจอง / ค่ามัดจำ — booking deposit for a reservation. */
  reservationDepositMonths: 1,
} as const
