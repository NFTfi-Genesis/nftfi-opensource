import { useCallback } from 'react'
import { useWallet } from 'src/modules/wallet/useWallet'
import { makeCollectionOffer, MakeCollectionOfferParams } from 'src/services/mutators/offer/makeCollectionOffer'
import { DataKeys, DataKeyMatchers } from '../../keys/keys'
import { useMutator } from '../base/useMutator'

export function useMakeCollectionOffer() {
  const { walletAddress, getSigner } = useWallet()
  const getKey = useCallback((_: MakeCollectionOfferParams) => DataKeys.offersByLender(walletAddress), [walletAddress])

  const invalidateKeys = useCallback(() => DataKeyMatchers.offersAll(), [])

  return useMutator(
    {
      getKey,
      mutator: (offer: MakeCollectionOfferParams) => makeCollectionOffer(walletAddress!, offer, { walletAddress: walletAddress!, getSigner }),
      invalidateKeys,
    }
  )
}
