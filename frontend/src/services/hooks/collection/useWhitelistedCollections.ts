import { DataKeys } from '../../keys/keys'
import { getWhitelistedCollections, GetWhitelistedCollectionsParams, } from '../../fetchers/collection/getWhitelistedCollections'
import { useFetcher } from '../base/useFetcher'

export function useWhitelistedCollections(params: GetWhitelistedCollectionsParams) {
  return useFetcher(
    DataKeys.whitelistedCollections(params),
    () => getWhitelistedCollections(params),
  )
}
