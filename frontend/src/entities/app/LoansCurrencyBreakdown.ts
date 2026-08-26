import { Amount } from '../base/Amount'

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
