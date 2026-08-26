import { Amount } from '../base/Amount'
import { Percentage } from '../base/Percentage'

export type DueDateLoansStats = {
  date: string
  loanCount: number
  totalUsdValue: Amount
  avgUsdValue: Amount
  avgApr: Percentage
}
