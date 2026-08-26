import { useCallback } from 'react'
import { useAuth } from 'src/modules/auth/useAuth'
import { useWallet } from 'src/modules/wallet/useWallet'
import { createListing } from 'src/services/mutators/listing/createListing'
import { Listing } from 'src/entities/domain/Listing'
import { DataKeys, DataKeyMatchers } from '../../keys/keys'
import { useMutator } from '../base/useMutator'

export function useCreateListing() {
  const { walletAddress } = useWallet()
  const { ensureAuthToken, unauthorize } = useAuth()
  const getKey = useCallback((_: Omit<Listing, 'borrower'>) => DataKeys.listingsBorrow(walletAddress), [walletAddress])
  const invalidateKeys = useCallback(() => DataKeyMatchers.listingsAll(), [])

  return useMutator(
    {
      getKey,
      mutator: (listing: Omit<Listing, 'borrower'>) => createListing(
        {
          ...listing,
          borrower: walletAddress!,
        },
        {
          ensureAuthToken,
          unauthorize,
        }
      ),
      invalidateKeys,
    }
  )
}
