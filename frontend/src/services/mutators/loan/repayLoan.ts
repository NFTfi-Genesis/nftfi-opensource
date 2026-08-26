import { Loan } from 'src/entities/domain/Loan'
import { getNftfiLoanContractAndORId } from '../../fetchers/ethereum/getNftfiLoanContractAndORId'
import { OnChainFetcherDependencies } from '../../factories/onChain/createOnChainFetcher'
import { createOnChainMutator, OnChainMutatorDependencies } from '../../factories/onChain/createOnChainMutator'

const abi = ['function payBackLoan(uint32 _loanId)']

type RepayLoanDependencies = OnChainFetcherDependencies & OnChainMutatorDependencies

const payBackLoanMutator = createOnChainMutator({
  abi,
  method: 'payBackLoan',
})

export async function repayLoan(loanId: Loan['loanId'], dependencies: RepayLoanDependencies) {
  const { loanContractAddress } = await getNftfiLoanContractAndORId(loanId, dependencies)

  return payBackLoanMutator(
    {
      contractAddress: loanContractAddress,
      args: [loanId],
    },
    dependencies
  )
}
