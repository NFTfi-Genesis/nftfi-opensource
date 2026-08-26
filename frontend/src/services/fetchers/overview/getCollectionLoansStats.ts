import { MarketFilters } from 'src/features/market/tables/useMarketFilters'
import { LoansStatsByCollection } from 'src/entities/app/LoansStatsByCollection'
import { Entities } from 'src/entities/utils/Entities'
import { Amount } from 'src/entities/base/Amount'
import { Percentage } from 'src/entities/base/Percentage'
import { createNftfiApiFetcher } from '../../factories/nftfiApi/createNftfiApiFetcher'
import { AuthMode } from '../../types/AuthMode'
import { serializeAnalyticsParams } from './utils'

export type GetCollectionLoansStatsParams = {
  filters: MarketFilters
}

export type ApiResponseCollectionLoansStats = {
  collectionId: number
  collectionName: string
  collectionImageUrl: string | null
  totalUsdValue: number | null
  avgUsdValue: number | null
  avgApr: number | null
  loanCount: number | null
  percentageOfTotal: number | null
}

const collectionLoansStatsFetcher = createNftfiApiFetcher<ApiResponseCollectionLoansStats[]>({
  authMode: AuthMode.None,
})

export async function getCollectionLoansStats(params: GetCollectionLoansStatsParams) {
  const qs = serializeAnalyticsParams({
    filters: params.filters,
    pagination: { page: 0, pageSize: 200 },
  })
  const response = await collectionLoansStatsFetcher({ url: `v1/analytics/stats-by-collection?${qs}` }, null as never)
  return convertCollectionLoansStats(response)
}

function convertCollectionLoansStats(data: ApiResponseCollectionLoansStats[]): Entities<LoansStatsByCollection> {
  return data.map(collection => ({
    name: collection.collectionName || '',
    imageUrl: collection.collectionImageUrl || '',
    loanCount: collection.loanCount || 0,
    totalUsdValue: (collection.totalUsdValue as Amount) || (0 as Amount),
    avgUsdValue: (collection.avgUsdValue as Amount) || (0 as Amount),
    avgApr: (collection.avgApr as Percentage) || (0 as Percentage),
    share: (collection.percentageOfTotal as Percentage) || (0 as Percentage),
  }))
}
