import { CollectionInfo } from 'src/entities/app/CollectionInfo'
import { CollectionExtended } from 'src/entities/app/CollectionExtended'
import { Address } from 'src/entities/base/Address'
import { traversePages } from 'src/utils/fetchers'
import { CollectionStats } from 'src/entities/app/CollectionStats'
import { Amount } from 'src/entities/base/Amount'
import { Percentage } from 'src/entities/base/Percentage'
import { Seconds } from 'src/entities/base/Seconds'
import { parseCollectionTokenRange } from 'src/utils/collections'
import { createNftfiApiFetcher } from '../../factories/nftfiApi/createNftfiApiFetcher'
import { AuthMode } from '../../types/AuthMode'

const getAllWhitelistedCollectionsFetcher = createNftfiApiFetcher<ApiResponseAllWhitelistedCollections>({
  authMode: AuthMode.None,
})

export async function getAllWhitelistedCollections(): Promise<
  CollectionExtended<CollectionInfo | CollectionStats>[]
> {
  const limit = 50
  const data = await traversePages(async page => {
    const data = await getAllWhitelistedCollectionsFetcher({
      url: `/collections?whitelisted=true&page=${page}&limit=${limit}&projection=stats`,
    }, null as never)
    if (!data) {
      return { results: [] }
    }
    return data
  }, limit)
  return convertAllWhitelistedCollections(data)
}

function convertAllWhitelistedCollections(
  data: ApiResponseAllWhitelistedCollections
): CollectionExtended<CollectionInfo | CollectionStats>[] {
  return data.results.map(result => ({
    id: result.id,
    address: result.contract as Address,
    ...parseCollectionTokenRange(result.tokenRange, {
      collectionId: result.id,
    }),
    info: {
      name: result.name,
      imageUri: result.imageUrl,
      openseaSlug: result.openseaSlug,
    },
    stats: {
      loanCount: result.stats.count,
      totalLoanAmount: result.stats.totalUsd as Amount,
      avgLoanAmount: result.stats.averageUsd as Amount,
      avgApr: result.stats.averageApr as Percentage,
      avgDuration: result.stats.averageDuration as Seconds,
      marketShare: (result.stats.marketPct * 100) as Percentage,
    },
  }))
}

type ApiResponseAllWhitelistedCollections = {
  results: Array<{
    id: string
    contract: string
    tokenRange: string
    tokenSupply: string
    tokenStandard: string
    name: string
    ranking: number
    imageUrl: string
    openseaSlug?: string
    floor: null
    stats: {
      count: number
      totalUsd: number
      averageUsd: number
      averageApr: number
      averageDuration: number
      marketPct: number
    }
  }>
}
