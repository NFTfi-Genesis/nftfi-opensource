import { Loan } from 'src/entities/domain/Loan'
import { LoanExtensionOffer } from 'src/entities/domain/LoanExtensionOffer'
import { PanicError } from 'src/errors/PanicError'
import { getNftfiLoanContractAndORId } from 'src/services/fetchers/ethereum/getNftfiLoanContractAndORId'
import { OnChainFetcherDependencies } from 'src/services/factories/onChain/createOnChainFetcher'
import { createOnChainMutator, OnChainMutatorDependencies } from 'src/services/factories/onChain/createOnChainMutator'

const abi = [
  'function renegotiateLoan(uint32 _loanId, uint32 _newLoanDuration, uint256 _newMaximumRepaymentAmount, uint256 _renegotiationFee, uint256 _lenderNonce, uint256 _expiry, bool _isProRata, bytes _lenderSignature)',
]

const renegotiateLoanMutator = createOnChainMutator({
  abi,
  method: 'renegotiateLoan',
})

export type AcceptLoanExtensionOfferDependencies = OnChainFetcherDependencies & OnChainMutatorDependencies

export type AcceptLoanExtensionOfferParams = {
  offer: LoanExtensionOffer
  loan: Pick<Loan, 'terms'>
}

export async function acceptLoanExtensionOffer(
  params: AcceptLoanExtensionOfferParams,
  dependencies: AcceptLoanExtensionOfferDependencies,
) {
  const { offer, loan } = params
  if (loan.terms.repaymentMax == null) {
    throw new PanicError({ message: 'Loan repaymentMax is required to accept extension', details: { loanId: offer.loanId } })
  }
  const { loanContractAddress } = await getNftfiLoanContractAndORId(offer.loanId, dependencies)

  // Extension is duration-only: new max repayment + pro-rata equal the loan's current
  // values (what the lender signed over), so they come from the loan, not the offer.
  return renegotiateLoanMutator(
    {
      contractAddress: loanContractAddress,
      args: [
        offer.loanId,
        offer.terms.duration,
        loan.terms.repaymentMax.toString(),
        offer.terms.fee.toString(),
        offer.lenderNonce.toString(),
        offer.expiry,
        loan.terms.isProRated ?? false,
        offer.signature,
      ],
    },
    dependencies,
  )
}
