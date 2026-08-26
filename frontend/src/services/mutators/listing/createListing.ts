import { createNftfiApiMutator, NftfiApiMutatorDependencies } from 'src/services/factories/nftfiApi/createNftfiApiMutator'
import { AuthMode } from 'src/services/types/AuthMode'
import { HttpMethod } from 'src/services/types/HttpMethod'
import { getCurrencyAddress } from 'src/utils/currencies'
import { Listing } from 'src/entities/domain/Listing'

const SECONDS_PER_DAY = 86400

type CreateListingResponse = unknown

type CreateListingRequestBody = {
  nftContract: string
  nftTokenId: string
  borrower: string
  duration: number
  currency: string | null
  prorated: boolean | null
  preference: 'highAmount' | 'lowApr'
}

const createListingMutator = createNftfiApiMutator<CreateListingResponse, AuthMode.Required>({
  authMode: AuthMode.Required,
  method: HttpMethod.POST,
})

export async function createListing(listing: Listing, dependencies: NftfiApiMutatorDependencies<AuthMode.Required>) {
  return await createListingMutator({
    url: '/v1/listings',
    body: convertListingToRequestBody(listing),
  }, dependencies)
}

function convertListingToRequestBody(listing: Listing): CreateListingRequestBody {
  return {
    nftContract: listing.nft.address.toLowerCase(),
    nftTokenId: listing.nft.id.toString(),
    borrower: listing.borrower.toLowerCase(),
    duration: listing.desiredTerms.duration * SECONDS_PER_DAY,
    currency: listing.desiredTerms.currency
      ? getCurrencyAddress(listing.desiredTerms.currency).toLowerCase()
      : null,
    prorated: listing.desiredTerms.isProRated,
    preference: listing.desiredTerms.preference,
  }
}
