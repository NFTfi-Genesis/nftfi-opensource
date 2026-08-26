import { useCallback } from 'react'
import { Offer } from 'src/entities/domain/Offer'
import { useWallet } from 'src/modules/wallet/useWallet'
import { useAuth } from 'src/modules/auth/useAuth'
import { DataKeyMatchers, DataKeys } from '../keys/keys'
import { revokeOffer } from '../mutators/offer/revokeOffer'
import { useMutator } from './base/useMutator'

export function useRevokeOffer() {
  const { getSigner, walletAddress } = useWallet()
  const { ensureAuthToken, unauthorize } = useAuth()
  const getKey = useCallback((_: Offer) => DataKeys.offersByLender(walletAddress), [walletAddress])

  const invalidateKeys = useCallback(() => DataKeyMatchers.offersAll(), [])

  return useMutator({
    getKey,
    mutator: (offer: Offer) => revokeOffer(offer, { getSigner, ensureAuthToken, unauthorize }),
    invalidateKeys,
  })
}
