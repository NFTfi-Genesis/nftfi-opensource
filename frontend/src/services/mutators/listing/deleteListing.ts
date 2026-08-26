import { createNftfiApiMutator, NftfiApiMutatorDependencies } from 'src/services/factories/nftfiApi/createNftfiApiMutator'
import { Listing } from 'src/entities/domain/Listing'
import { AuthMode } from 'src/services/types/AuthMode'
import { HttpMethod } from 'src/services/types/HttpMethod'

type DeleteListingResponse = unknown

const deleteListingMutator = createNftfiApiMutator<DeleteListingResponse, AuthMode.Required>({
  authMode: AuthMode.Required,
  method: HttpMethod.DELETE,
})

export async function deleteListing(listing: Listing, dependencies: NftfiApiMutatorDependencies<AuthMode.Required>) {
  return await deleteListingMutator({
    url: `/v1/listings/${listing.nft.address.toLowerCase()}/${listing.nft.id.toString()}`,
  }, dependencies)
}
