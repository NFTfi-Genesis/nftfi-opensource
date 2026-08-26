import { Address } from 'src/entities/base/Address'
import { Offer } from 'src/entities/domain/Offer'
import { getOfferTupleForTx } from 'src/utils/offers'
import { PanicError } from 'src/errors/PanicError'
import { contracts } from 'src/config/contracts'
import { Loan } from 'src/entities/domain/Loan'
import { createOnChainMutator, OnChainMutatorDependencies } from '../../factories/onChain/createOnChainMutator'
import { getNftfiLoanContractAndORId } from '../../fetchers/ethereum/getNftfiLoanContractAndORId'
import { OnChainFetcherDependencies } from '../../factories/onChain/createOnChainFetcher'

type RefinanceLoanNftfiDependencies = OnChainFetcherDependencies & OnChainMutatorDependencies

const abi = [
  'function refinanceLoan(tuple(uint256 loanIdentifier, address refinanceableContract) _refinancingData, tuple(uint256 loanPrincipalAmount, uint256 maximumRepaymentAmount, uint256 nftCollateralId, address nftCollateralContract, uint32 loanDuration, address loanERC20Denomination, bool isProRata, uint256 originationFee) _offer, tuple(uint256 nonce, uint256 expiry, address signer, bytes signature) _lenderSignature, bytes _extraData)',
]

const refinanceLoanMutator = createOnChainMutator({
  abi,
  method: 'refinanceLoan',
})

export async function refinanceLoanNftfi(loan: Loan, offer: Offer, dependencies: RefinanceLoanNftfiDependencies) {
  if (!offer.signature) {
    throw new PanicError({ message: 'Offer signature is required' })
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

  const refinanceContractAddress = contracts.nftfi.v3.refinance.address as Address
  const extraData = '0x'

  return refinanceLoanMutator({
    contractAddress: refinanceContractAddress,
    args: [refinancingDataTuple, offerTuple, lenderSignatureTuple, extraData],
  }, dependencies)
}
