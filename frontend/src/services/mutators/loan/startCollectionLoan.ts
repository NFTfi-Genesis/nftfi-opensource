import { CollectionOffer, OfferType } from 'src/entities/domain/Offer'
import { PanicError } from 'src/errors/PanicError'
import { getOfferTupleForTx } from 'src/utils/offers'
import { Nft } from 'src/entities/domain/Nft'
import { createOnChainMutator, OnChainMutatorDependencies } from '../../factories/onChain/createOnChainMutator'
import { getNftfiLatestLoanContract } from '../../fetchers/ethereum/getNftfiLatestLoanContract'
import { OnChainFetcherDependencies } from '../../factories/onChain/createOnChainFetcher'

type StartCollectionLoanDependencies = OnChainFetcherDependencies & OnChainMutatorDependencies

const abi = [
  'function acceptCollectionOfferWithIdRange(tuple(uint256 loanPrincipalAmount, uint256 maximumRepaymentAmount, uint256 nftCollateralId, address nftCollateralContract, uint32 loanDuration, address loanERC20Denomination, bool isProRata, uint256 originationFee) _offer, tuple(uint256 minId, uint256 maxId) _idRange, tuple(uint256 nonce, uint256 expiry, address signer, bytes signature) _signature)',
]

const acceptCollectionOfferMutator = createOnChainMutator({
  abi,
  method: 'acceptCollectionOfferWithIdRange',
})

export async function startCollectionLoan(
  offer: CollectionOffer,
  nft: Nft,
  dependencies: StartCollectionLoanDependencies
) {
  if (!offer.signature) {
    throw new PanicError({ message: 'Offer signature is required', details: { offer } })
  }

  const contractAddress = await getNftfiLatestLoanContract(OfferType.Collection, dependencies)

  const offerTuple = getOfferTupleForTx(offer, nft)

  const idRangeTuple = {
    minId: offer.tokenRange.from.toString(),
    maxId: offer.tokenRange.to.toString(),
  }

  const signatureTuple = {
    nonce: offer.nonce,
    expiry: Number(offer.expiry).toString(),
    signer: offer.lender,
    signature: offer.signature,
  }

  return acceptCollectionOfferMutator(
    {
      contractAddress,
      args: [offerTuple, idRangeTuple, signatureTuple],
    },
    dependencies
  )
}
