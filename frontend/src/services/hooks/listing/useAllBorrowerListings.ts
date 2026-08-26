import { Address } from 'src/entities/base/Address'
import { DataKeys } from '../../keys/keys'
import { getAllBorrowerListings } from '../../fetchers/listing/getAllBorrowerListings'
import { useFetcher } from '../base/useFetcher'

export function useAllBorrowerListings(borrower: Address) {
  return useFetcher(
    DataKeys.listingsBorrow(borrower),
    () => getAllBorrowerListings(borrower),
  )
}
