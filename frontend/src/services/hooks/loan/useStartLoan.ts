import { useCallback } from 'react'
import { useWallet } from 'src/modules/wallet/useWallet'
import { startLoan, StartLoanParams } from '../../mutators/loan/startLoan'
import { DataKeys, DataKeyMatchers } from '../../keys/keys'
import { useMutator } from '../base/useMutator'

export function useStartLoan() {
  const { getSigner, getProvider, walletAddress } = useWallet()

  const getKey = useCallback((_: StartLoanParams) => DataKeys.loansByBorrower(walletAddress), [walletAddress])

  const invalidateKeys = useCallback(() => DataKeyMatchers.loansAll(), [])

  return useMutator({
    getKey,
    mutator: async (params: StartLoanParams) => {
      return await startLoan(params, { getSigner, getProvider })
    },
    invalidateKeys,
  })
}
