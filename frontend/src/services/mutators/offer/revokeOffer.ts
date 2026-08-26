import { config } from 'src/config/config'
import { Offer } from 'src/entities/domain/Offer'
import { getOfferTypeBytes } from 'src/utils/offers'
import { createOnChainMutator, OnChainMutatorDependencies } from '../../factories/onChain/createOnChainMutator'
import { NftfiApiMutatorDependencies } from '../../factories/nftfiApi/createNftfiApiMutator'
import { AuthMode } from '../../types/AuthMode'
import { softDeleteOffer } from './softDeleteOffer'

const coordinatorAddress = config.ethereum.contracts.nftfi.v3.coordinator.address

const abi = [
  'function cancelLoanCommitment(bytes32 _offerType, uint256 _nonce)',
]

const revokeOfferMutator = createOnChainMutator({
  abi,
  method: 'cancelLoanCommitment',
})

export type RevokeOfferDependencies = OnChainMutatorDependencies & NftfiApiMutatorDependencies<AuthMode.Required>

export async function revokeOffer(offer: Offer, dependencies: RevokeOfferDependencies) {
  const offerTypeBytes32 = getOfferTypeBytes(offer.type)
  await revokeOfferMutator({
    contractAddress: coordinatorAddress,
    args: [offerTypeBytes32, offer.nonce],
  }, dependencies)

  if(!offer.isDeleted) {
    await softDeleteOffer(offer.id, dependencies)
  }
}
