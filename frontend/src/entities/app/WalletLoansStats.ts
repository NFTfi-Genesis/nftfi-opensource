import { Amount } from '../base/Amount'

export type WalletLoansStats = {
  lenderLoansCount: number
  borrowerLoansCount: number
  lenderTotalAmountUsd: Amount
  borrowerTotalAmountUsd: Amount
}
