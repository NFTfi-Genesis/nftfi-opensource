import { Offer } from 'src/entities/domain/Offer'
import { config } from 'src/config/config'
import { getOfferTypeBytes } from 'src/utils/offers'
import { createOnChainFetcher, OnChainFetcherDependencies } from '../../factories/onChain/createOnChainFetcher'

const validateOfferNonceFetcher = createOnChainFetcher<boolean>({
  abi: [
    'function getWhetherNonceHasBeenUsedForUser(bytes32 offerType, address lender, uint256 nonce) view returns (bool)',
  ],
  method: 'getWhetherNonceHasBeenUsedForUser',
})

export async function validateOfferNonce(offer: Offer, dependencies: OnChainFetcherDependencies) {
  const offerTypeBytes = getOfferTypeBytes(offer.type)
  const lenderAddress = offer.lender
  const nonce = offer.nonce

  const isUsedNonce = await validateOfferNonceFetcher({
    contractAddress: config.ethereum.contracts.nftfi.v3.coordinator.address,
    args: [offerTypeBytes, lenderAddress, nonce],
  }, dependencies)
  return !isUsedNonce
}
