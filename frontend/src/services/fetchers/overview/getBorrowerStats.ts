import { Address } from 'src/entities/base/Address'
import { BorrowerSortBy, BorrowerStats } from 'src/entities/app/BorrowerStats'
import { Amount } from 'src/entities/base/Amount'
import { Percentage } from 'src/entities/base/Percentage'
import { MarketFilters } from 'src/features/market/tables/useMarketFilters'
import {
  PaginationParams,
} from 'src/entities/app/PaginationParams'
import { SortParams } from 'src/entities/app/SortParams'
import { EntitiesPaginated } from 'src/entities/utils/EntitiesPaginated'
import { createNftfiApiFetcher } from '../../factories/nftfiApi/createNftfiApiFetcher'
import { AuthMode } from '../../types/AuthMode'
import { getPaginationTotal, normalizeAddress, serializeAnalyticsParams } from './utils'

export type GetBorrowerStatsParams = {
  filters: MarketFilters
  pagination?: PaginationParams
  sort?: SortParams<BorrowerSortBy>
}

type ApiBorrowerStats = {
  borrower: Address
  totalUsdValue: Amount | null
  avgUsdValue: Amount | null
  avgApr: Percentage | null
  loanCount: number | null
}

const borrowerStatsFetcher = createNftfiApiFetcher<ApiBorrowerStats[], AuthMode.None, true>({
  authMode: AuthMode.None,
  includeHeaders: true,
})

const borrowerSortByMap: Record<BorrowerSortBy, string> = {
  [BorrowerSortBy.borrowerAddress]: 'address',
  [BorrowerSortBy.totalUsdValue]: 'totalUsdValue',
  [BorrowerSortBy.avgUsdValue]: 'avgUsdValue',
  [BorrowerSortBy.avgApr]: 'avgApr',
  [BorrowerSortBy.loanCount]: 'loanCount',
}

export async function getBorrowerStats(params: GetBorrowerStatsParams) {
  const qs = serializeAnalyticsParams({
    filters: { ...params.filters, borrower: null },
    pagination: params.pagination,
    sort: params.sort,
    sortByMap: borrowerSortByMap,
  })

  const response = await borrowerStatsFetcher({ url: `/v1/analytics/stats-by-borrower?${qs}` }, null as never)
  return convertBorrowerStats(response)
}

function convertBorrowerStats(
  response: { data: ApiBorrowerStats[], headers: Headers }
): EntitiesPaginated<BorrowerStats> {
  return {
    data: response.data.map(item => ({
      borrowerAddress: normalizeAddress(item.borrower),
      outstandingDebt: item.totalUsdValue || 0 as Amount,
      avgValue: item.avgUsdValue || 0 as Amount,
      avgApr: item.avgApr || 0 as Percentage,
      loanCount: item.loanCount || 0,
    })),
    total: getPaginationTotal(response.headers, response.data.length),
  }
}
