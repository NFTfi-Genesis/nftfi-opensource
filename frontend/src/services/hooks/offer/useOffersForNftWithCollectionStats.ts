import { useMemo, useCallback } from 'react'
import { Nft } from 'src/entities/domain/Nft'
import { useComposeFetchers, ComposeFetchersReducer } from 'src/hooks/useComposeFetchers'
import { getOfferCollectionAddress } from 'src/utils/offers'
import { Loan } from 'src/entities/domain/Loan'
import { OfferExtended } from 'src/entities/app/OfferExtended'
import { CollectionStats } from 'src/entities/app/CollectionStats'
import { OfferValidated } from 'src/entities/app/OfferValidated'
import { useAllWhitelistedCollections } from '../collection/useAllWhitelistedCollections'
import { useOffersForNft } from './useOffersForNft'

type ResponsesMap = {
  offers: ReturnType<typeof useOffersForNft>
  collections: ReturnType<typeof useAllWhitelistedCollections>
}

export function useOffersForNftWithCollectionStats({ nft, loan }: { nft: Nft, loan?: Loan }) {
  const offers = useOffersForNft({ nft, loan })
  const collections = useAllWhitelistedCollections()

  const collectionStatsByAddress = useMemo(() => {
    const map = new Map<string, CollectionStats>()
    if (!collections.data) {
      return map
    }
    collections.data.forEach(collection => {
      if (collection.stats) {
        map.set(collection.address.toLowerCase(), collection.stats)
      }
    })
    return map
  }, [collections.data])

  const reducer: ComposeFetchersReducer<ResponsesMap, Array<OfferExtended<CollectionStats | OfferValidated>>> = useCallback(
    data => {
      if (!data.offers) {
        return []
      }
      return data.offers.map(offer => {
        const collectionAddress = getOfferCollectionAddress(offer)
        const collectionStats = collectionAddress
          ? collectionStatsByAddress.get(collectionAddress.toLowerCase())
          : undefined
        return {
          ...offer,
          collectionStats,
        } as OfferExtended<CollectionStats | OfferValidated>
      })
    },
    [collectionStatsByAddress]
  )

  const responses = useMemo(
    () => ({
      offers,
      collections,
    }),
    [offers, collections]
  )

  return useComposeFetchers({
    responses,
    reducer,
  })
}
