import { Collection } from 'src/entities/domain/Collection'
import { getCollectionMarketInfo } from '../../fetchers/collection/getCollectionMarketInfo'
import { DataKeys } from '../../keys/keys'
import { useFetcher, UseFetcherOptions } from '../base/useFetcher'

export function useCollectionMarketInfo(collection: Collection, options?: UseFetcherOptions) {
  const result = useFetcher(
    DataKeys.collectionMarketInfo(collection),
    () => getCollectionMarketInfo(collection),
    options,
  )
  return result
}
