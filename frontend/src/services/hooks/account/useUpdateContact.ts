import { useCallback } from 'react'
import { useAuth } from 'src/modules/auth/useAuth'
import { Contact } from 'src/entities/domain/Contact'
import { useWallet } from 'src/modules/wallet/useWallet'
import { updateContact } from 'src/services/mutators/account/updateContact'
import { DataKeys } from '../../keys/keys'
import { useMutator } from '../base/useMutator'

export function useUpdateContact() {
  const { walletAddress } = useWallet()
  const { ensureAuthToken, unauthorize } = useAuth()

  const getKey = useCallback((_contactId: string, _contact: Omit<Contact, 'contactId' | 'createdAt'>) => DataKeys.contacts(walletAddress), [walletAddress])

  const getOptimisticData = useCallback((contactId: string, contact: Omit<Contact, 'contactId' | 'createdAt'>) => (contacts: Contact[]) => {
    return contacts.map(c => c.contactId === contactId
      ? { ...c, ...contact }
      : c)
  }, [])

  return useMutator(
    {
      getKey,
      mutator: (contactId, contact) => updateContact(walletAddress!, contactId, contact, { ensureAuthToken, unauthorize }),
      getOptimisticData,
    }
  )
}
