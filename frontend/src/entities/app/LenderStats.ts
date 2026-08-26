import { Address } from '../base/Address'
import { Amount } from '../base/Amount'
import { Percentage } from '../base/Percentage'

export type LenderStats = {
  lenderAddress: Address
  outstandingDebt: Amount
  avgValue: Amount
  avgApr: Percentage
  loanCount: number
}

// TODO: probably move to a different place
export enum LenderSortBy {
  lenderAddress = 'lenderAddress',
  totalUsdValue = 'total_usd_value',
  avgUsdValue = 'avg_usd_value',
  avgApr = 'avg_apr',
  loanCount = 'loan_count',
}
