import { Nft } from 'src/entities/domain/Nft'
import { NftMarketInfo } from 'src/entities/app/NftMarketInfo'
import { getNftMarketInfo } from '../../fetchers/nft/getNftMarketInfo'
import { DataKeys } from '../../keys/keys'
import { useFetcher, UseFetcherOptions, UseFetcherResult } from '../base/useFetcher'

export function useNftMarketInfo(nft: Nft, options?: UseFetcherOptions): UseFetcherResult<NftMarketInfo | null> {
  const result = useFetcher(
    DataKeys.nftMarketInfo(nft),
    () => getNftMarketInfo(nft),
    options,
  )
  return result
}
