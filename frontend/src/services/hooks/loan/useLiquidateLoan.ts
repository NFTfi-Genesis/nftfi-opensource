import { useCallback } from 'react'
import { Loan } from 'src/entities/domain/Loan'
import { useWallet } from 'src/modules/wallet/useWallet'
import { DataKeyMatchers, DataKeys } from '../../keys/keys'
import { liquidateLoan } from '../../mutators/loan/liquidateLoan'
import { useMutator } from '../base/useMutator'

export function useLiquidateLoan() {
  const { getSigner, walletAddress } = useWallet()

  const getKey = useCallback((_: Loan) => DataKeys.loansByBorrower(walletAddress), [walletAddress])
  const invalidateKeys = useCallback(() => DataKeyMatchers.loansAll(), [])

  return useMutator({
    getKey,
    mutator: async (loan: Loan) => await liquidateLoan(loan, { getSigner }),
    invalidateKeys,
  })
}
