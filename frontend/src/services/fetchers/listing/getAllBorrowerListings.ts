import { Address } from 'src/entities/base/Address'
import { traversePages } from 'src/utils/fetchers'
import { getListings } from './getListings'

export async function getAllBorrowerListings(borrower: Address) {
  const limit = 100
  const listings = await traversePages(async page => {
    const data = await getListings({
      filters: {
        borrower,
        currency: null,
        duration: null,
        collections: [],
      },
      pagination: {
        page,
        pageSize: limit,
      },
    }, null as never)
    if (!data) {
      return { results: [] }
    }
    return { results: data.data }
  }, limit)
  return listings.results
}
