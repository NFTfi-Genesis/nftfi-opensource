import { Offer } from 'src/entities/domain/Offer'
import { HttpMethod } from '../../types/HttpMethod'
import { createNftfiApiMutator, NftfiApiMutatorDependencies } from '../../factories/nftfiApi/createNftfiApiMutator'
import { AuthMode } from '../../types/AuthMode'

const softDeleteOfferMutator = createNftfiApiMutator({
  authMode: AuthMode.Required,
  method: HttpMethod.DELETE,
})

export async function softDeleteOffer(offerId: Offer['id'], dependencies: NftfiApiMutatorDependencies<AuthMode.Required>) {
  await softDeleteOfferMutator({
    url: `/v1/offers/${offerId}`,
  }, dependencies)
}
