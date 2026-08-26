import { Address } from 'src/entities/base/Address'
import { Seconds } from 'src/entities/base/Seconds'
import { getWalletLoansStats, GetWalletLoansStatsParams } from '../../fetchers/overview/getWalletLoansStats'
import { DataKeys } from '../../keys/keys'
import { useFetcher } from '../base/useFetcher'

type UseWalletLoansStatsParams = Omit<GetWalletLoansStatsParams, 'wallet'> & {
  wallet: Address | null
  shouldExecute?: boolean
}
export function useWalletLoansStats({ wallet, shouldExecute, ...params }: UseWalletLoansStatsParams) {
  return useFetcher(DataKeys.walletLoansStats(wallet), () => getWalletLoansStats({ ...params, wallet: wallet! }), {
    pollInterval: 60 as Seconds,
    shouldExecute,
  })
}
