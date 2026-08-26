import { Loan } from 'src/entities/domain/Loan'
import { createOnChainMutator, OnChainMutatorDependencies } from '../../factories/onChain/createOnChainMutator'

const abi = ['function liquidateOverdueLoan(uint32 _loanId)']

type LiquidateLoanDependencies = OnChainMutatorDependencies

const liquidateLoanMutator = createOnChainMutator({
  abi,
  method: 'liquidateOverdueLoan',
})

export async function liquidateLoan(loan: Loan, dependencies: LiquidateLoanDependencies) {
  if (!loan.loanContract) {
    throw new Error(`Cannot foreclose loan ${loan.loanId}: missing loan contract address`)
  }

  return liquidateLoanMutator(
    {
      contractAddress: loan.loanContract,
      args: [loan.loanId],
    },
    dependencies
  )
}
