import { Address } from 'src/entities/base/Address'
import { WalletLoansStats } from 'src/entities/app/WalletLoansStats'
import { Amount } from 'src/entities/base/Amount'
import { createNftfiApiFetcher } from '../../factories/nftfiApi/createNftfiApiFetcher'
import { AuthMode } from '../../types/AuthMode'

export type GetWalletLoansStatsParams = {
  wallet: Address
}

type ApiResponseWalletLoansStats = {
  wallet: string
  lenderLoansCount: number | null
  borrowerLoansCount: number | null
  lenderTotalAmountUsd: number | null
  borrowerTotalAmountUsd: number | null
}

const loanStatsByWalletFetcher = createNftfiApiFetcher<ApiResponseWalletLoansStats>({
  authMode: AuthMode.None,
})

export async function getWalletLoansStats(params: GetWalletLoansStatsParams) {
  const response = await loanStatsByWalletFetcher({
    url: `v1/analytics/stats-by-wallet?wallet=${params.wallet}`,
  }, null as never)
  return convertWalletLoansStats(response)
}

function convertWalletLoansStats(response: ApiResponseWalletLoansStats): WalletLoansStats | null {
  if (!response) {
    return null
  }
  return {
    lenderLoansCount: response.lenderLoansCount || 0,
    borrowerLoansCount: response.borrowerLoansCount || 0,
    lenderTotalAmountUsd: (response.lenderTotalAmountUsd || 0) as Amount,
    borrowerTotalAmountUsd: (response.borrowerTotalAmountUsd || 0) as Amount,
  }
}
