import { Address } from 'src/entities/base/Address'
import { ContractOffer } from 'src/entities/domain/Offer'
import { PanicError } from 'src/errors/PanicError'
import { contracts } from 'src/config/contracts'
import { Loan } from 'src/entities/domain/Loan'
import { getOfferTupleForTx } from 'src/utils/offers'
import { createOnChainMutator, OnChainMutatorDependencies } from '../../factories/onChain/createOnChainMutator'
import { GondiRefinanceData } from '../../types/GondiRefinanceData'

const abi = [
  'function refinanceCollectionOfferLoan(tuple(uint256 loanIdentifier, address refinanceableContract) _refinancingData, tuple(uint256 loanPrincipalAmount, uint256 maximumRepaymentAmount, uint256 nftCollateralId, address nftCollateralContract, uint32 loanDuration, address loanERC20Denomination, bool isProRata, uint256 originationFee) _offer, tuple(uint256 nonce, uint256 expiry, address signer, bytes signature) _lenderSignature, bytes _extraData)',
]

const refinanceContractLoanMutator = createOnChainMutator({
  abi,
  method: 'refinanceCollectionOfferLoan',
})

export async function refinanceContractLoanGondi(
  loan: Loan,
  offer: ContractOffer,
  refiData: GondiRefinanceData,
  dependencies: OnChainMutatorDependencies
) {
  if (!offer.signature) {
    throw new PanicError({ message: 'Offer signature is required', details: { offer } })
  }

  const refinancingDataTuple = {
    loanIdentifier: loan.loanId,
    refinanceableContract: refiData.loanContractAddress,
  }

  const offerTuple = getOfferTupleForTx(offer, loan.nft)

  const lenderSignatureTuple = {
    nonce: offer.nonce,
    expiry: Number(offer.expiry).toString(),
    signer: offer.lender,
    signature: offer.signature,
  }

  const refinanceContractAddress = contracts.nftfi.v3.refinance.address as Address

  return refinanceContractLoanMutator(
    {
      contractAddress: refinanceContractAddress,
      args: [refinancingDataTuple, offerTuple, lenderSignatureTuple, refiData.encodedRepaymentData],
    },
    dependencies
  )
}
