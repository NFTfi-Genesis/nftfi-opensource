import { serializeDashboardParams } from 'src/features/market/tables/utils'
import { getAllActiveCollections, GetAllActiveCollectionsParams } from 'src/services/fetchers/collection/getAllActiveCollections'
import { DataKeys } from '../../keys/keys'
import { useFetcher } from '../base/useFetcher'

export function useAllActiveCollections(params: GetAllActiveCollectionsParams) {
  const qs = serializeDashboardParams({
    filters: params.filters,
  })

  return useFetcher(DataKeys.activeCollections(qs), () => getAllActiveCollections(params))
}
