import { useMemo, useCallback } from 'react'
import { Address } from 'src/entities/base/Address'
import { useComposeFetchers, ComposeFetchersReducer } from 'src/hooks/useComposeFetchers'
import { CollectionExtended } from 'src/entities/app/CollectionExtended'
import { NftInfo } from 'src/entities/app/NftInfo'
import { CollectionInfo } from 'src/entities/app/CollectionInfo'
import { CollectionStats } from 'src/entities/app/CollectionStats'
import { Listing } from 'src/entities/domain/Listing'
import { NftExtended } from 'src/entities/app/NftExtended'
import { useAllBorrowerListings } from '../listing/useAllBorrowerListings'
import { useWalletNfts } from './useWalletNfts'

type ResponsesMap = {
  walletNfts: ReturnType<typeof useWalletNfts>
  listings: ReturnType<typeof useAllBorrowerListings>
}

export function useWalletNftsWithListings(walletAddress: Address) {
  const walletNfts = useWalletNfts(walletAddress)
  const listings = useAllBorrowerListings(walletAddress)

  const reducer: ComposeFetchersReducer<
    ResponsesMap,
    NftExtended<NftInfo | CollectionExtended<CollectionInfo | CollectionStats> | Listing>[]
  > = useCallback(
    data => {
      if (!data.walletNfts) {
        return []
      }
      if (!data.listings) {
        return data.walletNfts
      }
      return data.walletNfts.map(walletNft => {
        const listing = data.listings!.find(listing => listing.nft.address === walletNft.address && listing.nft.id === walletNft.id)
        return {
          ...walletNft,
          listing: listing,
        }
      })
    },
    []
  )

  const responses = useMemo(
    () => ({
      walletNfts,
      listings,
    }),
    [walletNfts, listings]
  )

  return useComposeFetchers({
    responses,
    reducer,
  })
}
