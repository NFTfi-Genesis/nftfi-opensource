import { MarketFilters } from 'src/features/market/tables/useMarketFilters'
import { Amount } from 'src/entities/base/Amount'
import { Days } from 'src/entities/base/Days'
import { Percentage } from 'src/entities/base/Percentage'
import { LoansOverviewInfo } from 'src/entities/app/LoansOverviewInfo'
import { createNftfiApiFetcher } from '../../factories/nftfiApi/createNftfiApiFetcher'
import { AuthMode } from '../../types/AuthMode'
import { serializeAnalyticsParams } from './utils'

export type GetLoansOverviewInfoParams = {
  filters: MarketFilters
}

export type ApiResponseLoansOverviewInfo = {
  totalUsdValue: number | null
  totalRepaymentUsd: number | null
  avgUsdValue: number | null
  avgApr: number | null
  weightedAvgApr: number | null
  weightedAvgDuration: number | null
  loanCount: number | null
  lendedLoansCount: number | null
  borrowedLoansCount: number | null
  totalEthValueOfEthLoans: number | null
  totalUsdValueOfUsdLoans: number | null
  totalInterestEthOfEthLoans: number | null
  totalInterestUsdOfUsdLoans: number | null
  totalPrincipalEthOfEthLoans: number | null
  totalPrincipalUsdOfUsdLoans: number | null
}

const loansOverviewInfoFetcher = createNftfiApiFetcher<ApiResponseLoansOverviewInfo>({
  authMode: AuthMode.None,
})

export async function getLoansOverviewInfo(params: GetLoansOverviewInfoParams) {
  const qs = serializeAnalyticsParams({ filters: params.filters })

  const response = await loansOverviewInfoFetcher({ url: `v1/analytics/summary?${qs}` }, null as never)
  return convertLoansOverviewInfo(response)
}

function convertLoansOverviewInfo(data: ApiResponseLoansOverviewInfo): LoansOverviewInfo | null {
  if (!data) {
    return null
  }
  return {
    loanCount: data.loanCount || 0,
    totalUsdValue: (data.totalUsdValue as Amount) || (0 as Amount),
    totalPrincipal: (data.totalRepaymentUsd as Amount) || (0 as Amount),
    avgUsdValue: (data.avgUsdValue as Amount) || (0 as Amount),
    avgApr: (data.avgApr as Percentage) || (0 as Percentage),
    weightedAvgApr: (data.weightedAvgApr as Percentage) || (0 as Percentage),
    weightedAvgDuration: (data.weightedAvgDuration as Days) || (0 as Days),
    lendedLoansCount: data.lendedLoansCount || 0,
    borrowedLoansCount: data.borrowedLoansCount || 0,
    totalValueOfEthTokens: (data.totalEthValueOfEthLoans as Amount) || (0 as Amount),
    totalValueOfUsdTokens: (data.totalUsdValueOfUsdLoans as Amount) || (0 as Amount),
    totalInterestOfEthLoans: (data.totalInterestEthOfEthLoans as Amount) || (0 as Amount),
    totalInterestOfUsdLoans: (data.totalInterestUsdOfUsdLoans as Amount) || (0 as Amount),
    totalPrincipalOfEthLoans: (data.totalPrincipalEthOfEthLoans as Amount) || (0 as Amount),
    totalPrincipalOfUsdLoans: (data.totalPrincipalUsdOfUsdLoans as Amount) || (0 as Amount),
  }
}
