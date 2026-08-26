import { Loan } from 'src/entities/domain/Loan'
import { createOnChainMutator, OnChainMutatorDependencies } from '../../factories/onChain/createOnChainMutator'
import { getNftfiLoanContractAndORId } from '../../fetchers/ethereum/getNftfiLoanContractAndORId'
import { OnChainFetcherDependencies } from '../../factories/onChain/createOnChainFetcher'

export type MintORDependencies = OnChainFetcherDependencies & OnChainMutatorDependencies

const abi = ['function mintObligationReceipt(uint32 _loanId)']

const mintORMutator = createOnChainMutator({
  abi,
  method: 'mintObligationReceipt',
})

export async function mintOR(loanId: Loan['loanId'], dependencies: MintORDependencies) {
  const { loanContractAddress } = await getNftfiLoanContractAndORId(loanId, dependencies)

  return mintORMutator(
    {
      contractAddress: loanContractAddress,
      args: [loanId],
    },
    dependencies
  )
}
