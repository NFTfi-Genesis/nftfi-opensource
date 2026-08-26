import { useCallback } from 'react'
import { useWallet } from 'src/modules/wallet/useWallet'
import { refreshAuthToken } from 'src/services/mutators/auth/refreshAuthToken'
import { DataKeys } from '../../keys/keys'
import { useMutator, UseMutatorOptions } from '../base/useMutator'

export function useRefreshAuthToken(options?: UseMutatorOptions<{ token: string, refreshToken: string }>) {
  const { walletAddress } = useWallet()
  const getKey = useCallback((_: string) => DataKeys.auth(walletAddress), [walletAddress])

  return useMutator(
    {
      getKey,
      mutator: refreshToken => refreshAuthToken(refreshToken)
    },
    options
  )
}
