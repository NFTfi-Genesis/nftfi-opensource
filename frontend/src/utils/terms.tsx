import { differenceInSeconds } from 'date-fns'
import { TFunction } from 'src/modules/translation/TFunction'
import { Currency } from 'src/entities/domain/Currency'
import { Terms } from 'src/entities/domain/Terms'
import { Loan } from 'src/entities/domain/Loan'
import { Seconds } from 'src/entities/base/Seconds'
import { Wei } from 'src/entities/base/Wei'
import { Percentage } from 'src/entities/base/Percentage'
import { getCurrencyTicker } from './currencies'

export type IsProratedOptions = Terms['isProRated'] | null
export const isProratedOptions: IsProratedOptions[] = [null, false, true]
export function getIsProratedOptionsDisplayText(isProratedOptions: IsProratedOptions, t: TFunction): string {
  switch (isProratedOptions) {
    case true:
      return t('borrow.flexible')
    case false:
      return t('borrow.fixed')
    case null:
      return t('filters.any')
  }
}

export type CurrencyOptions = Extract<Terms['currency'], Currency.WETH | Currency.USDC> | null
export const currencyOptions: CurrencyOptions[] = [null, Currency.WETH, Currency.USDC]
export function getCurrencyOptionsDisplayText(currencyOptions: CurrencyOptions, t: TFunction): string {
  if (currencyOptions === null) return t('filters.any')
  return getCurrencyTicker(currencyOptions)
}

type LoanForRepayment = Pick<Loan, 'dateStarted'> & {
  terms: Pick<Loan['terms'], 'repayment' | 'principal'> & {
    duration: Seconds | null
    isProRated?: boolean
  }
}

export function calculateRepayment(loan: LoanForRepayment): Wei {
  const isFlexible = loan.terms.isProRated ?? false

  if (!isFlexible) {
    return loan.terms.repayment
  }

  const timeElapsed = BigInt(differenceInSeconds(new Date(), loan.dateStarted))

  const totalInterest = loan.terms.repayment - loan.terms.principal

  const duration = loan.terms.duration ?? 0
  const proRataInterest = duration > 0
    ? (totalInterest * timeElapsed) / BigInt(duration)
    : (BigInt(0) as Wei)

  const repaymentAmount = loan.terms.principal + proRataInterest

  return repaymentAmount as Wei
}

type LoanForMaxInterest = {
  terms: Pick<Loan['terms'], 'repayment' | 'principal'>
}

export function calculateMaxInterestAtTerm(loan: LoanForMaxInterest): Wei {
  const maxInterest = loan.terms.repayment - loan.terms.principal
  return maxInterest as Wei
}

type LoanForMinEffectiveApr = {
  terms: Pick<Loan['terms'], 'repayment' | 'principal' | 'duration'> & {
    origination?: Wei
  }
}

export function calculateMinEffectiveApr(loan: LoanForMinEffectiveApr): Percentage {
  const principal = loan.terms.principal
  const repayment = loan.terms.repayment
  const originationFee = loan.terms.origination ?? 0n

  const totalPaid = repayment + originationFee
  const interestPaid = totalPaid - principal

  const durationSeconds = loan.terms.duration != null
    ? BigInt(loan.terms.duration)
    : 0n
  const secondsInYear = BigInt(365 * 24 * 60 * 60)

  const numerator = interestPaid * secondsInYear * 10000n
  const denominator = principal * durationSeconds
  if (denominator === 0n || durationSeconds === 0n) {
    return 0 as Percentage
  }

  const aprBasisPoints = numerator / denominator
  const apr = Number(aprBasisPoints) / 100

  return (
    Number.isFinite(apr)
      ? Math.max(apr, 0)
      : 0
  ) as Percentage
}

type LoanForCurrentEffectiveApr = Pick<Loan, 'dateStarted'> & {
  terms: Pick<Loan['terms'], 'repayment' | 'principal' | 'duration'> & {
    isProRated?: boolean
    origination?: Wei
  }
}

export function calculateCurrentEffectiveApr(loan: LoanForCurrentEffectiveApr): Percentage {
  const isFlexible = loan.terms.isProRated ?? false

  // For fixed loans, use the end-of-term calculation
  if (!isFlexible) {
    return calculateMinEffectiveApr(loan)
  }

  const principal = loan.terms.principal
  const originationFee = loan.terms.origination ?? 0n
  const currentRepayment = calculateRepayment(loan)

  const totalPaid = currentRepayment + originationFee
  const interestPaid = totalPaid - principal

  const timeElapsedSeconds = BigInt(differenceInSeconds(new Date(), loan.dateStarted))
  const secondsInYear = BigInt(365 * 24 * 60 * 60)

  if (timeElapsedSeconds === 0n) {
    return 0 as Percentage
  }

  const numerator = interestPaid * secondsInYear * 10000n
  const denominator = principal * timeElapsedSeconds
  if (denominator === 0n) {
    return 0 as Percentage
  }

  const aprBasisPoints = numerator / denominator
  const apr = Number(aprBasisPoints) / 100

  return (
    Number.isFinite(apr)
      ? Math.max(apr, 0)
      : 0
  ) as Percentage
}

export function calculateRefinanceProceedsAtTerm(
  principal: Wei,
  origination: Wei,
  repayment: Wei
): Wei {
  return (principal - origination - repayment) as Wei
}
