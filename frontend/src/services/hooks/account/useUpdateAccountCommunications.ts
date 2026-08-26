import { useCallback } from 'react'
import { useAuth } from 'src/modules/auth/useAuth'
import { useWallet } from 'src/modules/wallet/useWallet'
import { Account } from 'src/entities/domain/Account'
import { updateAccount } from 'src/services/mutators/account/updateAccount'
import { DataKeys } from '../../keys/keys'
import { useMutator } from '../base/useMutator'

export type AccountCommunicationsUpdate = Partial<Account['communications']>

export function useUpdateAccountCommunications() {
  const { walletAddress } = useWallet()
  const { ensureAuthToken, unauthorize } = useAuth()

  const getKey = useCallback((_: AccountCommunicationsUpdate) => DataKeys.account(walletAddress), [walletAddress])

  const getOptimisticData = useCallback((comms: AccountCommunicationsUpdate) => (userProfile: Account) => ({
    ...userProfile,
    communications: {
      ...userProfile?.communications || {},
      ...comms,
    }
  }), [])

  return useMutator(
    {
      mutator: comms => updateAccount(walletAddress!, { communications: comms }, { ensureAuthToken, unauthorize }),
      getKey,
      getOptimisticData,
    }
  )
}
