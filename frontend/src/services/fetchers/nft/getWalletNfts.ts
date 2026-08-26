import { config } from 'src/config/config'
import { createNftfiApiFetcher } from 'src/services/factories/nftfiApi/createNftfiApiFetcher'
import { Address } from 'src/entities/base/Address'
import { NftInfo } from 'src/entities/app/NftInfo'
import { NftExtended } from 'src/entities/app/NftExtended'
import { CollectionExtended } from 'src/entities/app/CollectionExtended'
import { CollectionInfo } from 'src/entities/app/CollectionInfo'
import { traversePages } from 'src/utils/fetchers'
import { CollectionStats } from 'src/entities/app/CollectionStats'
import { Amount } from 'src/entities/base/Amount'
import { Percentage } from 'src/entities/base/Percentage'
import { Seconds } from 'src/entities/base/Seconds'
import { parseCollectionTokenRange } from 'src/utils/collections'
import { AuthMode } from '../../types/AuthMode'

const getWalletNftsFetcher = createNftfiApiFetcher<NftfiApiWalletNftsResponse>({
  authMode: AuthMode.None,
})

export async function getWalletNfts(walletAddress: Address): Promise<NftExtended<NftInfo | CollectionExtended<CollectionInfo | CollectionStats>>[]> {
  const limit = 100
  const testNfts = config.test.nfts?.find(testNft => testNft.owner === walletAddress)
  const nfts = await traversePages(async page => {
    if (testNfts) {
      const data = await getWalletNftsFetcher({
        url: `/assets?keys=${testNfts.nfts.map(nft => `${nft.address}-${nft.id}`).join(',')}&page=${page}&limit=${limit}&projection=collection.stats`,
      }, null as never)
      if (!data) {
        return { results: [] }
      }
      return data
    } else {
      const data = await getWalletNftsFetcher({
        url: `/assets?whitelisted=true&wallet=${walletAddress}&page=${page}&limit=${limit}&projection=collection.stats`,
      }, null as never)
      if (!data) {
        return { results: [] }
      }
      return data
    }
  }, limit)
  return convertNftfiApiWalletNftsToNfts(nfts)
}

function convertNftfiApiWalletNftsToNfts(nftfiApiWalletNfts: NftfiApiWalletNftsResponse): NftExtended<NftInfo | CollectionExtended<CollectionInfo | CollectionStats>>[] {
  return nftfiApiWalletNfts.results.map(result => {
    return {
      id: BigInt(result.tokenId),
      address: result.contract as Address,
      info: {
        name: result.name || `#${result.tokenId}`,
        imageUri: result.imageMediumUrl,
      },
      collection: {
        id: result.collection.id,
        key: `${result.collection.contract as Address}-${BigInt(result.collection.tokenRange.split(':')[0])}`,
        address: result.collection.contract as Address,
        ...parseCollectionTokenRange(result.collection.tokenRange, {
          collectionId: result.collection.id,
        }),
        info: {
          name: result.collection.name,
          imageUri: result.collection.imageUrl,
          openseaSlug: result.collection.openseaSlug,
        },
        stats: {
          loanCount: result.collection.stats.count,
          totalLoanAmount: result.collection.stats.totalUsd as Amount,
          avgLoanAmount: result.collection.stats.averageUsd as Amount,
          avgApr: result.collection.stats.averageApr as Percentage,
          avgDuration: result.collection.stats.averageDuration as Seconds,
          marketShare: (result.collection.stats.marketPct * 100) as Percentage,
        }
      }
    }
  })
}

type NftfiApiWalletNftsResponse = {
  results: Array<{
    contract: string
    owners: string[]
    tokenId: string
    name: string
    imageSmallUrl: string
    imageMediumUrl: string
    collection: {
      id: string
      contract: string
      tokenRange: `${number}` | `${number}:${number}`
      tokenSupply: string
      tokenStandard: string
      name: string
      ranking: number
      imageUrl: string
      openseaSlug?: string
      stats: {
        count: number
        totalUsd: number
        averageUsd: number
        // APR in percentage
        averageApr: number
        averageDuration: number
        // Market share in raw fraction
        marketPct: number
      }
    }
  }>
}
