import { Amount } from 'src/entities/base/Amount'
import { Days } from 'src/entities/base/Days'
import { Percentage } from 'src/entities/base/Percentage'

// /v1/analytics/currency-breakdown
// values are in USD in human readable format
export type LoansCurrencyBreakdown = {
  total: Amount
  usdc: Amount
  usdcNative: Amount
  dai: Amount
  daiNative: Amount
  weth: Amount
  wethNative: Amount
  wsteth: Amount
  wstethNative: Amount
}

export type LoansCurrencyBreakdownFormatted = {
  label: string
  value: Amount
  color: string
}[]

// /v1/analytics/protocol-breakdown
export type LoansProtocolBreakdown = {
  arcade: Amount
  blur: Amount
  gondi: Amount
  metastreet: Amount
  nftfi: Amount
  x2y2: Amount
  zharta: Amount
  total: Amount
}

export type LoansProtocolBreakdownFormatted = {
  label: string
  value: Amount
  color: string
}[]

// /v1/analytics/summary
export type LoansOverviewInfo = {
  loanCount: number
  totalUsdValue: Amount
  totalPrincipal: Amount
  avgUsdValue: Amount
  avgApr: Percentage
  weightedAvgApr: Percentage
  weightedAvgDuration: Days
  lendedLoansCount: number
  borrowedLoansCount: number
  totalValueOfEthTokens: Amount
  totalValueOfUsdTokens: Amount
  totalInterestOfEthLoans: Amount
  totalInterestOfUsdLoans: Amount
  totalPrincipalOfEthLoans: Amount
  totalPrincipalOfUsdLoans: Amount
}

// /v1/analytics/stats-by-day
export type LoanStatsByDueDate = {
  date: string
  loanCount: number
  totalUsdValue: Amount
  avgUsdValue: Amount
  avgApr: Percentage
}

// /v1/analytics/stats-by-collection
export type LoanStatsByCollection = {
  project: string
  projectImageUrl: string
  loanCount: number
  totalUsdValue: Amount
  avgUsdValue: Amount
  avgApr: Percentage
  share: Percentage
}

export type LoanStatsByCollectionFormatted = {
  label: string
  percentage: Percentage
}[]
