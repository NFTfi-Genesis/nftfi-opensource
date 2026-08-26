import { createNftfiApiMutator, NftfiApiMutatorDependencies } from 'src/services/factories/nftfiApi/createNftfiApiMutator'
import { Listing } from 'src/entities/domain/Listing'
import { AuthMode } from 'src/services/types/AuthMode'
import { HttpMethod } from 'src/services/types/HttpMethod'
import { getCurrencyAddress } from 'src/utils/currencies'

const SECONDS_PER_DAY = 86400

type UpdateListingResponse = unknown

type UpdateListingRequestBody = {
  duration: number
  currency: string | null
  prorated: boolean | null
  preference: 'highAmount' | 'lowApr'
}

const updateListingMutator = createNftfiApiMutator<UpdateListingResponse, AuthMode.Required>({
  authMode: AuthMode.Required,
  method: HttpMethod.PUT,
})

export async function updateListing(listing: Listing, dependencies: NftfiApiMutatorDependencies<AuthMode.Required>) {
  return await updateListingMutator({
    url: `/v1/listings/${listing.nft.address.toLowerCase()}/${listing.nft.id.toString()}`,
    body: convertListingToRequestBody(listing),
  }, dependencies)
}

function convertListingToRequestBody(listing: Listing): UpdateListingRequestBody {
  return {
    duration: listing.desiredTerms.duration * SECONDS_PER_DAY,
    currency: listing.desiredTerms.currency
      ? getCurrencyAddress(listing.desiredTerms.currency).toLowerCase()
      : null,
    prorated: listing.desiredTerms.isProRated,
    preference: listing.desiredTerms.preference,
  }
}
