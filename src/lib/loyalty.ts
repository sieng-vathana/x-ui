import type { LoyaltyProgram } from '../features/loyalty/loyaltyApi'

// Points and prices are decimals in floating point; the epsilon keeps 0.29 × 100 from flooring to 28.
const EPSILON = 1e-9

/** What points are worth in the sale currency, rounded down to the cent or riel as the server does. */
export function pointsValue(points: number, program: Pick<LoyaltyProgram, 'pointValueUsd'>, currency: string, usdToKhrRate: number): number {
  const valueUsd = points * program.pointValueUsd
  return currency.toUpperCase() === 'KHR'
    ? Math.floor(valueUsd * usdToKhrRate + EPSILON)
    : Math.floor(valueUsd * 100 + EPSILON) / 100
}

/** The most points a sale can use: no more than the customer has, nor worth more than the sale before tax. */
export function maxRedeemablePoints(
  balance: number,
  saleBeforeTax: number,
  program: Pick<LoyaltyProgram, 'pointValueUsd'>,
  currency: string,
  usdToKhrRate: number,
): number {
  const pointWorth = currency.toUpperCase() === 'KHR' ? program.pointValueUsd * usdToKhrRate : program.pointValueUsd
  if (pointWorth <= 0 || saleBeforeTax <= 0) return 0
  let points = Math.max(0, Math.min(balance, Math.floor(saleBeforeTax / pointWorth + EPSILON)))
  while (points > 0 && pointsValue(points, program, currency, usdToKhrRate) > saleBeforeTax) points -= 1
  return points
}
