import { DataKeys } from '../../keys/keys'
import { getAllWhitelistedCollections } from '../../fetchers/collection/getAllWhitelistedCollections'
import { useFetcher, UseFetcherOptions } from '../base/useFetcher'

export function useAllWhitelistedCollections(options: UseFetcherOptions = {}) {
  return useFetcher(
    DataKeys.allWhitelistedCollections(),
    () => getAllWhitelistedCollections(),
    options,
  )
}
