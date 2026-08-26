import { useCallback } from 'react'
import { useAuth } from 'src/modules/auth/useAuth'
import { useWallet } from 'src/modules/wallet/useWallet'
import { updateAccount, AccountUpdate } from 'src/services/mutators/account/updateAccount'
import { DataKeys } from '../../keys/keys'
import { useMutator } from '../base/useMutator'

export function useUpdateAccount() {
  const { walletAddress } = useWallet()
  const { ensureAuthToken, unauthorize } = useAuth()

  const getKey = useCallback((_: AccountUpdate) => DataKeys.account(walletAddress), [walletAddress])

  return useMutator(
    {
      getKey,
      mutator: account => updateAccount(walletAddress!, account, { ensureAuthToken, unauthorize })
    }
  )
}
