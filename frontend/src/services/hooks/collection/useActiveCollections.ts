import { serializeDashboardParams } from 'src/features/market/tables/utils'
import { Seconds } from 'src/entities/base/Seconds'
import { getActiveCollections, GetActiveCollectionsParams } from 'src/services/fetchers/collection/getActiveCollections'
import { DataKeys } from '../../keys/keys'
import { useFetcher } from '../base/useFetcher'

export function useActiveCollections(params: GetActiveCollectionsParams) {
  const qs = serializeDashboardParams({
    filters: params.filters,
    pagination: params.pagination,
  })

  return useFetcher(DataKeys.activeCollections(qs), () => getActiveCollections(params), {
    pollInterval: 60 as Seconds,
  })
}
