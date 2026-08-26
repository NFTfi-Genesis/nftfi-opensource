import { PaginationParams } from 'src/entities/app/PaginationParams'
import { SortParams } from 'src/entities/app/SortParams'
import { LenderSortBy, LenderStats } from 'src/entities/app/LenderStats'
import { MarketFilters } from 'src/features/market/tables/useMarketFilters'
import { EntitiesPaginated } from 'src/entities/utils/EntitiesPaginated'
import { Address } from 'src/entities/base/Address'
import { Amount } from 'src/entities/base/Amount'
import { Percentage } from 'src/entities/base/Percentage'
import { createNftfiApiFetcher } from '../../factories/nftfiApi/createNftfiApiFetcher'
import { AuthMode } from '../../types/AuthMode'
import { getPaginationTotal, normalizeAddress, serializeAnalyticsParams } from './utils'

export type GetLenderStatsParams = {
  filters: MarketFilters
  pagination?: PaginationParams
  sort?: SortParams<LenderSortBy>
}

type ApiLenderStats = {
  lender: Address
  totalUsdValue: Amount | null
  avgUsdValue: Amount | null
  avgApr: Percentage | null
  loanCount: number | null
}

const lenderStatsFetcher = createNftfiApiFetcher<ApiLenderStats[], AuthMode.None, true>({
  authMode: AuthMode.None,
  includeHeaders: true,
})

const lenderSortByMap: Record<LenderSortBy, string> = {
  [LenderSortBy.lenderAddress]: 'address',
  [LenderSortBy.totalUsdValue]: 'totalUsdValue',
  [LenderSortBy.avgUsdValue]: 'avgUsdValue',
  [LenderSortBy.avgApr]: 'avgApr',
  [LenderSortBy.loanCount]: 'loanCount',
}

export async function getLenderStats(params: GetLenderStatsParams) {
  const qs = serializeAnalyticsParams({
    filters: { ...params.filters, lender: null },
    pagination: params.pagination,
    sort: params.sort,
    sortByMap: lenderSortByMap,
  })

  const response = await lenderStatsFetcher({ url: `v1/analytics/stats-by-lender?${qs}` }, null as never)

  return convertLenderStats(response)
}

function convertLenderStats(response: { data: ApiLenderStats[], headers: Headers }): EntitiesPaginated<LenderStats> {
  return {
    data: response.data.map(item => ({
      lenderAddress: normalizeAddress(item.lender),
      outstandingDebt: item.totalUsdValue || (0 as Amount),
      avgValue: item.avgUsdValue || (0 as Amount),
      avgApr: item.avgApr || (0 as Percentage),
      loanCount: item.loanCount || 0,
    })),
    total: getPaginationTotal(response.headers, response.data.length),
  }
}
