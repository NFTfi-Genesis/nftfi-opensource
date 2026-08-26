import { ContractOffer, CollectionOffer } from 'src/entities/domain/Offer'
import { Address } from 'src/entities/base/Address'
import { CollectionOfferExtended } from 'src/entities/app/OfferExtended'
import { getCollectionsByContract } from '../collection/getCollectionsByContract'

export async function tryNarrowContractOffer(offer: ContractOffer): Promise<
| CollectionOfferExtended
| ContractOffer> {
  const collections = await getCollectionsByContract(offer.contract)
  if (collections.length === 1) {
    const collection = collections[0]
    const collectionOffer = {
      ...offer,
      collection,
      tokenRange: { from: collection.start, to: collection.end },
      isContractOfferOriginally: true,
    }
    // Remove the contract property from the collection offer to ensure it won't be recognized as a contract offer
    delete (collectionOffer as CollectionOffer & { contract?: Address }).contract
    return collectionOffer
  }
  return offer
}
