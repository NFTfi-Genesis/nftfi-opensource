import { MarketFilters } from 'src/features/market/tables/useMarketFilters'
import { traversePages } from 'src/utils/fetchers'
import { getActiveCollections } from './getActiveCollections'

export type GetAllActiveCollectionsParams = {
  filters: MarketFilters
}

export async function getAllActiveCollections(params: GetAllActiveCollectionsParams) {
  const limit = 200
  const startPage = 0
  const collections = await traversePages(async page => {
    const data = await getActiveCollections({
      filters: params.filters,
      pagination: {
        page,
        pageSize: limit,
      },
    })
    if (!data) {
      return { results: [] }
    }
    return { results: data.data }
  }, limit, startPage)
  return collections.results
}
