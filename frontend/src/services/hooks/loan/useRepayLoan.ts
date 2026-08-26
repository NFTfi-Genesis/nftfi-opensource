import { useCallback } from 'react'
import { Loan } from 'src/entities/domain/Loan'
import { useWallet } from 'src/modules/wallet/useWallet'
import { DataKeyMatchers, DataKeys } from '../../keys/keys'
import { repayLoan } from '../../mutators/loan/repayLoan'
import { useMutator } from '../base/useMutator'

export function useRepayLoan() {
  const { getSigner, getProvider, walletAddress } = useWallet()

  const getKey = useCallback((_: Loan['loanId']) => DataKeys.loansByBorrower(walletAddress), [walletAddress])
  const invalidateKeys = useCallback(() => DataKeyMatchers.loansAll(), [])

  return useMutator({
    getKey,
    mutator: async (loanId: Loan['loanId']) => {
      return await repayLoan(loanId, { getSigner, getProvider })
    },
    invalidateKeys,
  })
}
