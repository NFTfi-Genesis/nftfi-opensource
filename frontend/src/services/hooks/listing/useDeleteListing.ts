import { useCallback } from 'react'
import { useAuth } from 'src/modules/auth/useAuth'
import { useWallet } from 'src/modules/wallet/useWallet'
import { Listing } from 'src/entities/domain/Listing'
import { deleteListing } from 'src/services/mutators/listing/deleteListing'
import { DataKeys, DataKeyMatchers } from 'src/services/keys/keys'
import { useMutator } from '../base/useMutator'

export function useDeleteListing() {
  const { walletAddress } = useWallet()
  const { ensureAuthToken, unauthorize } = useAuth()
  const getKey = useCallback((_: Listing) => DataKeys.listingsBorrow(walletAddress), [walletAddress])
  const invalidateKeys = useCallback(() => DataKeyMatchers.listingsAll(), [])

  return useMutator(
    {
      getKey,
      mutator: (listing: Listing) => deleteListing(
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
