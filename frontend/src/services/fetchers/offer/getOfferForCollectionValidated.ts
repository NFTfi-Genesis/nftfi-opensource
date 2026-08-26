import { OfferValidated } from 'src/entities/app/OfferValidated'
import { Collection } from 'src/entities/domain/Collection'
import { AssetOfferExtended, CollectionOfferExtended, ContractOfferExtended } from 'src/entities/app/OfferExtended'
import { AuthMode } from '../../types/AuthMode'
import { NftfiApiFetcherDependencies } from '../../factories/nftfiApi/createNftfiApiFetcher'
import { OnChainFetcherDependencies } from '../../factories/onChain/createOnChainFetcher'
import { validateOffer } from './validateOffer'
import { getOffersForCollection } from './getOffersForCollection'

export type GetOffersForCollectionValidatedDependencies = NftfiApiFetcherDependencies<AuthMode.Required> & OnChainFetcherDependencies

export async function getOffersForCollectionValidated(
  collection: Collection,
  deps: GetOffersForCollectionValidatedDependencies
): Promise<Array<
  | AssetOfferExtended<OfferValidated>
  | CollectionOfferExtended<OfferValidated>
  | ContractOfferExtended<OfferValidated>
>> {
  const offers = await getOffersForCollection(collection, deps)
  return await Promise.all(offers.map(async offer => await validateOffer({ offer }, deps)))
}
