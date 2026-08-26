import { getListings, GetListingsParams } from '../../fetchers/listing/getListings'
import { DataKeys } from '../../keys/keys'
import { useFetcher } from '../base/useFetcher'

export function useListings(params: GetListingsParams) {
  return useFetcher(
    DataKeys.listingsLend(params),
    () => getListings(params, null as never),
  )
}
