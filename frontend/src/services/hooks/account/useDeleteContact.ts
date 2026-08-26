import { useCallback } from 'react'
import { useAuth } from 'src/modules/auth/useAuth'
import { useWallet } from 'src/modules/wallet/useWallet'
import { Contact } from 'src/entities/domain/Contact'
import { DataKeys } from '../../keys/keys'
import { deleteContact } from '../../mutators/account/deleteContact'
import { useMutator } from '../base/useMutator'

export function useDeleteContact() {
  const { walletAddress } = useWallet()
  const { ensureAuthToken, unauthorize } = useAuth()

  const getKey = useCallback((_: string) => DataKeys.contacts(walletAddress), [walletAddress])

  const getOptimisticData = useCallback((contactId: string) => (contacts: Contact[]) => {
    return contacts.filter(c => c.contactId !== contactId)
  }, [])

  return useMutator(
    {
      getKey,
      mutator: contactId => deleteContact(walletAddress!, contactId, { ensureAuthToken, unauthorize }),
      getOptimisticData,
    }
  )
}
