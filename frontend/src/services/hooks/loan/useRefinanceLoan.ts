import { useCallback } from 'react'
import { useWallet } from 'src/modules/wallet/useWallet'
import { refinanceLoan, RefinanceLoanParams } from '../../mutators/loan/refinanceLoan'
import { DataKeyMatchers, DataKeys } from '../../keys/keys'
import { DataKey } from '../../keys/types'
import { useMutator } from '../base/useMutator'

export function useRefinanceLoan() {
  const { getSigner, getProvider, walletAddress } = useWallet()

  const getKey = useCallback((_: RefinanceLoanParams) => DataKeys.loansByBorrower(walletAddress), [walletAddress])

  const invalidateKeys = useCallback(() => {
    const loansAllMatcher = DataKeyMatchers.loansAll()
    const offersAllMatcher = DataKeyMatchers.offersAll()

    return (key: DataKey) => {
      if (!key) return false
      return loansAllMatcher(key) || offersAllMatcher(key)
    }
  }, [])

  return useMutator({
    getKey,
    mutator: async (params: RefinanceLoanParams) => {
      return await refinanceLoan(params, { getSigner, getProvider })
    },
    invalidateKeys,
  })
}
