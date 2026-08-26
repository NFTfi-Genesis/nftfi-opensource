import { useCallback } from 'react'
import { useWallet } from 'src/modules/wallet/useWallet'
import { makeAssetOffer, MakeAssetOfferParams } from 'src/services/mutators/offer/makeAssetOffer'
import { DataKeys, DataKeyMatchers } from '../../keys/keys'
import { useMutator } from '../base/useMutator'

export function useMakeAssetOffer() {
  const { walletAddress, getSigner } = useWallet()
  const getKey = useCallback((_: MakeAssetOfferParams) => DataKeys.offersByLender(walletAddress), [walletAddress])

  const invalidateKeys = useCallback(() => DataKeyMatchers.offersAll(), [])

  return useMutator(
    {
      getKey,
      mutator: (offer: MakeAssetOfferParams) => makeAssetOffer(walletAddress!, offer, { walletAddress: walletAddress!, getSigner }),
      invalidateKeys,
    }
  )
}
