import { Amount } from '../base/Amount'
import { Percentage } from '../base/Percentage'
import { Days } from '../base/Days'

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
