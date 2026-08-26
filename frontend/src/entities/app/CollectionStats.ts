import { Amount } from '../base/Amount'
import { Seconds } from '../base/Seconds'
import { Percentage } from '../base/Percentage'

export type CollectionStats = {
  loanCount: number
  totalLoanAmount: Amount
  avgLoanAmount: Amount
  avgApr: Percentage
  avgDuration: Seconds
  marketShare: Percentage
}
