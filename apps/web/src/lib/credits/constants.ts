export const CREDIT_COST = { standard: 1, premium: 3 } as const
export type PublishTier = keyof typeof CREDIT_COST

export const TOPUP_PACKAGES = [
  { credits: 10,  price: 200  },
  { credits: 50,  price: 1000 },
  { credits: 100, price: 2000 },
] as const

export const STARTER_FREE_CREDITS = 3
export const PRO_MONTHLY_CREDITS  = 100
