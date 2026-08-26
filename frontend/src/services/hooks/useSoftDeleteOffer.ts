import { useCallback } from 'react'
import { Offer } from 'src/entities/domain/Offer'
import { useWallet } from 'src/modules/wallet/useWallet'
import { useAuth } from 'src/modules/auth/useAuth'
import { DataKeyMatchers, DataKeys } from '../keys/keys'
import { softDeleteOffer } from '../mutators/offer/softDeleteOffer'
import { useMutator } from './base/useMutator'

export function useSoftDeleteOffer() {
  const { walletAddress } = useWallet()
  const { ensureAuthToken, unauthorize } = useAuth()
  const getKey = useCallback((_: Offer['id']) => DataKeys.offersByLender(walletAddress), [walletAddress])

  const invalidateKeys = useCallback(() => DataKeyMatchers.offersAll(), [])

  return useMutator({
    getKey,
    mutator: (offerId: Offer['id']) => softDeleteOffer(offerId, { ensureAuthToken, unauthorize }),
    invalidateKeys,
  })
}
