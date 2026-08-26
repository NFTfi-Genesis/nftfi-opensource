import { Address } from 'src/entities/base/Address'
import { ContractOffer } from 'src/entities/domain/Offer'
import { getOfferTupleForTx } from 'src/utils/offers'
import { PanicError } from 'src/errors/PanicError'
import { config } from 'src/config/config'
import { Loan } from 'src/entities/domain/Loan'
import { createOnChainMutator, OnChainMutatorDependencies } from '../../factories/onChain/createOnChainMutator'
import { OnChainFetcherDependencies } from '../../factories/onChain/createOnChainFetcher'
import { getNftfiLoanContractAndORId } from '../../fetchers/ethereum/getNftfiLoanContractAndORId'

const refinanceContractAddress = config.ethereum.contracts.nftfi.v3.refinance.address as Address

type RefinanceContractLoanNftfiDependencies = OnChainFetcherDependencies & OnChainMutatorDependencies

const abi = [
  'function refinanceCollectionOfferLoan(tuple(uint256 loanIdentifier, address refinanceableContract) _refinancingData, tuple(uint256 loanPrincipalAmount, uint256 maximumRepaymentAmount, uint256 nftCollateralId, address nftCollateralContract, uint32 loanDuration, address loanERC20Denomination, bool isProRata, uint256 originationFee) _offer, tuple(uint256 nonce, uint256 expiry, address signer, bytes signature) _lenderSignature, bytes _extraData)',
]

const refinanceContractLoanMutator = createOnChainMutator({
  abi,
  method: 'refinanceCollectionOfferLoan',
})

export async function refinanceContractLoanNftfi(
  loan: Loan,
  offer: ContractOffer,
  dependencies: RefinanceContractLoanNftfiDependencies
) {
  if (!offer.signature) {
    throw new PanicError({ message: 'Offer signature is required', details: { offer } })
  }

  const { loanContractAddress } = await getNftfiLoanContractAndORId(loan.loanId, dependencies)

  const refinancingDataTuple = {
    loanIdentifier: loan.loanId,
    refinanceableContract: loanContractAddress,
  }

  const offerTuple = getOfferTupleForTx(offer, loan.nft)

  const lenderSignatureTuple = {
    nonce: offer.nonce,
    expiry: Number(offer.expiry).toString(),
    signer: offer.lender,
    signature: offer.signature,
  }

  const extraData = '0x'

  return refinanceContractLoanMutator(
    {
      contractAddress: refinanceContractAddress,
      args: [refinancingDataTuple, offerTuple, lenderSignatureTuple, extraData],
    },
    dependencies
  )
}
