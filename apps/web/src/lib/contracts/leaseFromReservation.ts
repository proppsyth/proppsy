/**
 * leaseFromReservation.ts — single mapping layer for reservation → lease defaults.
 *
 * All autofill logic for the "Create Lease from Reservation" workflow lives here.
 * Add new fields once here; CreateLeasePanel and createLeaseFromReservation both consume it.
 */

/** All reservation fields needed to pre-fill a new lease. */
export interface ReservationLease {
  reservationId:     string
  rentPrice:         number | null
  depositMonths:     number | null
  /** Security deposit on the reservation (rent × deposit_months). */
  depositAmount:     number | null
  /** Booking fee collected at reservation time (booking_amount column). */
  bookingAmount:     number | null
  contractMonths:    number | null
  /** ISO date string, e.g. "2026-07-01". Pre-fills lease move-in date. */
  moveInDate:        string | null
  paymentDayOfMonth: number | null
  paymentGraceDays:  number | null
  occupantCount:     number | null
  cleaningFee:       number | null
  acCount:           number | null
  acWashPerUnit:     number | null
  waterUnitPrice:    number | null
  electricUnitPrice: number | null
  internetFee:       number | null
  commonFee:         number | null
  parkingFee:        number | null
}

/** Extract the calendar day (1–31) from an ISO date string. */
export function payDayFromDate(dateStr: string): number {
  return new Date(dateStr).getDate()
}

/**
 * Suggested daily-rate late-payment penalty.
 * Formula: round(monthlyRent / 30)
 *
 * Due-day edge case (separate from this calculation):
 * If the due day is 31 and a month has only 28/29/30 days,
 * use the last day of that month in all payment schedule, reminder,
 * and renewal calculations. This rule is documented here as the canonical
 * source; call sites should clamp to month-end when needed.
 */
export function defaultPenaltyAmount(monthlyRent: number): number {
  return Math.round(monthlyRent / 30)
}

/**
 * Compute the lease end date (last day within the paid term).
 *
 * A 12-month lease starting June 19, 2026 ends June 18, 2027 —
 * the day before the anniversary. Month 1 covers June 19–July 18;
 * Month 12 covers May 19–June 18.
 *
 * Formula: moveIn + N months − 1 day.
 * Use this function everywhere end_date is computed so the rule is consistent
 * across lease creation, EditDraftPanel, ContractWizard, and payment schedules.
 */
export function computeLeaseEndDate(moveInDateStr: string, contractMonths: number): string {
  const d = new Date(moveInDateStr)
  d.setMonth(d.getMonth() + contractMonths)
  d.setDate(d.getDate() - 1)
  return d.toISOString().split('T')[0]!
}

/**
 * Build initial form state for CreateLeasePanel from a reservation snapshot.
 * Does NOT include `language` — the panel sets that from its own template list.
 */
export function buildLeaseFormDefaults(snap: ReservationLease) {
  const rent         = snap.rentPrice ?? 0
  const depositMths  = snap.depositMonths ?? 2
  const moveInDate   = snap.moveInDate ?? ''

  // Pay-day: prefer explicit value stored on reservation, else derive from move-in day
  const payDay = snap.paymentDayOfMonth != null
    ? String(snap.paymentDayOfMonth)
    : moveInDate
      ? String(payDayFromDate(moveInDate))
      : ''

  return {
    moveInDate,
    contractMonths:    String(snap.contractMonths ?? 12),
    rentPrice:         String(snap.rentPrice ?? ''),
    depositMonths:     String(depositMths),
    // "เงินมัดจำ/จอง" = the booking fee already collected at reservation time
    depositAmount:     String(snap.bookingAmount ?? ''),
    // "เงินประกัน" = full security deposit (default: rent × depositMonths)
    securityDeposit:   rent > 0 ? String(rent * depositMths) : '',
    cleaningFee:       String(snap.cleaningFee ?? ''),
    acCount:           String(snap.acCount ?? ''),
    acWashPerUnit:     String(snap.acWashPerUnit ?? ''),
    occupantCount:     String(snap.occupantCount ?? '1'),
    paymentGraceDays:  String(snap.paymentGraceDays ?? '5'),
    paymentDayOfMonth: payDay,
    penaltyAmount:     rent > 0 ? String(defaultPenaltyAmount(rent)) : '',
    waterUnitPrice:    String(snap.waterUnitPrice ?? ''),
    electricUnitPrice: String(snap.electricUnitPrice ?? ''),
    internetFee:       String(snap.internetFee ?? ''),
    commonFee:         String(snap.commonFee ?? ''),
    parkingFee:        String(snap.parkingFee ?? ''),
  }
}
