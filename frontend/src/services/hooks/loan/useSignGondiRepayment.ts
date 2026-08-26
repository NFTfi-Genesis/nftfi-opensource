import { useCallback } from 'react'

import { useWallet } from 'src/modules/wallet/useWallet'
import { PanicError } from 'src/errors/PanicError'
import { signGondiRepayment } from '../../mutators/loan/signGondiRepayment'
import { DataKeys } from '../../keys/keys'
import { useMutator } from '../base/useMutator'

export function useSignGondiRepayment() {
  const { getProvider, getSigner } = useWallet()

  // Enforce mutator even if hash is missing. The error will be raised downstream in the mutator
  const getKey = useCallback((hash?: string) => DataKeys.gondiRepaymentSignature(hash || ''), [])

  return useMutator({
    getKey,
    mutator: async (hash?: string) =>{
      if (!hash) {
        throw new PanicError({ message: 'Gondi sign repayment, hash is not available' })
      }
      return await signGondiRepayment(hash, { getProvider, getSigner })
    },
  })
}
