import { Address } from '../base/Address'
import { Amount } from '../base/Amount'
import { Percentage } from '../base/Percentage'

export type BorrowerStats = {
  borrowerAddress: Address
  outstandingDebt: Amount
  avgValue: Amount
  avgApr: Percentage
  loanCount: number
}

// TODO: probably move to a different place
export enum BorrowerSortBy {
  borrowerAddress = 'borrowerAddress',
  totalUsdValue = 'total_usd_value',
  avgUsdValue = 'avg_usd_value',
  avgApr = 'avg_apr',
  loanCount = 'loan_count',
}
