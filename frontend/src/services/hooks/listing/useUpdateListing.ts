import { useCallback } from 'react'
import { useAuth } from 'src/modules/auth/useAuth'
import { useWallet } from 'src/modules/wallet/useWallet'
import { updateListing } from 'src/services/mutators/listing/updateListing'
import { Listing } from 'src/entities/domain/Listing'
import { DataKeys, DataKeyMatchers } from '../../keys/keys'
import { useMutator } from '../base/useMutator'

export function useUpdateListing() {
  const { walletAddress } = useWallet()
  const { ensureAuthToken, unauthorize } = useAuth()
  const getKey = useCallback((_: Listing) => DataKeys.listingsBorrow(walletAddress), [walletAddress])
  const invalidateKeys = useCallback(() => DataKeyMatchers.listingsAll(), [])

  return useMutator(
    {
      getKey,
      mutator: (listing: Listing) => updateListing(
        {
          ...listing,
          borrower: walletAddress!,
        },
        { ensureAuthToken, unauthorize }
      ),
      invalidateKeys,
    }
  )
}
