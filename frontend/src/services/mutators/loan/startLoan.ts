import { Offer } from 'src/entities/domain/Offer'
import { Nft } from 'src/entities/domain/Nft'
import { isAssetOffer, isCollectionOffer, isContractOffer } from 'src/utils/offers'
import { PanicError } from 'src/errors/PanicError'
import { OnChainMutatorDependencies } from '../../factories/onChain/createOnChainMutator'
import { OnChainFetcherDependencies } from '../../factories/onChain/createOnChainFetcher'
import { startAssetLoan } from './startAssetLoan'
import { startCollectionLoan } from './startCollectionLoan'
import { startContractLoan } from './startContractLoan'

type StartLoanDependencies = OnChainFetcherDependencies & OnChainMutatorDependencies

export type StartLoanParams = {
  offer: Offer
  nft: Nft
}

export async function startLoan(params: StartLoanParams, dependencies: StartLoanDependencies) {
  const { offer, nft } = params

  if (isCollectionOffer(offer) && !offer.isContractOfferOriginally) {
    return await startCollectionLoan(offer, nft, dependencies)
  }

  if (isContractOffer(offer)) {
    return await startContractLoan(offer, nft, dependencies)
  }

  if (isAssetOffer(offer)) {
    return await startAssetLoan(offer, nft, dependencies)
  }

  throw new PanicError({ message: 'Unknown offer type when starting loan', details: { offer } })
}
