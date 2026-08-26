import { useCallback } from 'react'
import { useAuth } from 'src/modules/auth/useAuth'
import { Contact } from 'src/entities/domain/Contact'
import { createContact } from 'src/services/mutators/account/createContact'
import { useWallet } from 'src/modules/wallet/useWallet'
import { DataKeys } from '../../keys/keys'
import { useMutator } from '../base/useMutator'

export function useCreateContact() {
  const { walletAddress } = useWallet()
  const { ensureAuthToken, unauthorize } = useAuth()

  const getKey = useCallback((_: Omit<Contact, 'contactId' | 'createdAt'>) => DataKeys.contacts(walletAddress), [walletAddress])

  return useMutator(
    {
      getKey,
      mutator: contact => createContact(walletAddress!, contact, { ensureAuthToken, unauthorize }),
    }
  )
}
