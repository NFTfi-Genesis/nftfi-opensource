import { ContractOfferExtended, CollectionOfferExtended, AssetOfferExtended } from 'src/entities/app/OfferExtended'
import { OfferValidated } from 'src/entities/app/OfferValidated'
import { Nft } from 'src/entities/domain/Nft'
import { Loan } from 'src/entities/domain/Loan'
import { OfferStatus } from 'src/entities/domain/Offer'
import { AuthMode } from '../../types/AuthMode'
import { NftfiApiFetcherDependencies } from '../../factories/nftfiApi/createNftfiApiFetcher'
import { OnChainFetcherDependencies } from '../../factories/onChain/createOnChainFetcher'
import { validateOffer } from './validateOffer'
import { getOffersForNft } from './getOffersForNft'

export type GetOffersForNftValidatedDependencies = NftfiApiFetcherDependencies<AuthMode.Required> & OnChainFetcherDependencies

export async function getOffersForNftValidated({ nft, loan }: { nft: Nft, loan?: Loan }, deps: GetOffersForNftValidatedDependencies): Promise<Array<
| AssetOfferExtended<OfferValidated>
| CollectionOfferExtended<OfferValidated>
| ContractOfferExtended<OfferValidated>
>> {
  const offers = await getOffersForNft(nft, deps)
  const validatedOffers = await Promise.all(offers.map(async offer => await validateOffer({ offer, loan }, deps)))
  return validatedOffers.filter(offer => offer.status === OfferStatus.Active)
}
