import { AssetOffer, OfferType } from 'src/entities/domain/Offer'
import { PanicError } from 'src/errors/PanicError'
import { getOfferTupleForTx } from 'src/utils/offers'
import { Nft } from 'src/entities/domain/Nft'
import { createOnChainMutator, OnChainMutatorDependencies } from '../../factories/onChain/createOnChainMutator'
import { getNftfiLatestLoanContract } from '../../fetchers/ethereum/getNftfiLatestLoanContract'
import { OnChainFetcherDependencies } from '../../factories/onChain/createOnChainFetcher'

type StartLoanDependencies = OnChainFetcherDependencies & OnChainMutatorDependencies

const abi: string[] = [
  'function acceptOffer(tuple(uint256 loanPrincipalAmount, uint256 maximumRepaymentAmount, uint256 nftCollateralId, address nftCollateralContract, uint32 loanDuration, address loanERC20Denomination, bool isProRata, uint256 originationFee) _offer, tuple(uint256 nonce, uint256 expiry, address signer, bytes signature) _signature)',
]

const acceptOfferMutator = createOnChainMutator({
  abi,
  method: 'acceptOffer',
})

export async function startAssetLoan(offer: AssetOffer, nft: Nft, dependencies: StartLoanDependencies) {
  if (!offer.signature) {
    throw new PanicError({ message: 'Offer signature is required', details: { offer } })
  }

  const offerType = offer.type as OfferType
  const contractAddress = await getNftfiLatestLoanContract(offerType, dependencies)

  const offerTuple = getOfferTupleForTx(offer, nft)

  const signatureTuple = {
    nonce: offer.nonce,
    expiry: Number(offer.expiry).toString(),
    signer: offer.lender,
    signature: offer.signature,
  }

  console.log('[Start loan] offerTuple', offerTuple)
  console.log('[Start loan] signatureTuple', signatureTuple)
  console.log('[Start loan] contractAddress', contractAddress)

  return acceptOfferMutator(
    {
      contractAddress,
      args: [offerTuple, signatureTuple],
    },
    dependencies
  )
}
