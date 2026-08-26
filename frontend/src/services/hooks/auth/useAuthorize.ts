import { useCallback } from 'react'
import { useWallet } from 'src/modules/wallet/useWallet'
import { authorize } from 'src/services/mutators/auth/authorize'
import { DataKeys } from '../../keys/keys'
import { useMutator } from '../base/useMutator'

export function useAuthorize() {
  const { walletAddress, getSigner } = useWallet()
  const getKey = useCallback(() => DataKeys.auth(walletAddress), [walletAddress])

  return useMutator(
    {
      getKey,
      mutator: () => authorize(walletAddress!, { getSigner })
    }
  )
}
