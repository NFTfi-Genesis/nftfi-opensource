import { CollectionExtended } from 'src/entities/app/CollectionExtended'
import { CollectionInfo } from 'src/entities/app/CollectionInfo'
import { PaginationParams } from 'src/entities/app/PaginationParams'
import { EntitiesPaginated } from 'src/entities/utils/EntitiesPaginated'
import { Amount } from 'src/entities/base/Amount'
import { CollectionStats } from 'src/entities/app/CollectionStats'
import { Address } from 'src/entities/base/Address'
import { Percentage } from 'src/entities/base/Percentage'
import { Seconds } from 'src/entities/base/Seconds'
import { SortOrder, SortParams } from 'src/entities/app/SortParams'
import { CollectionMarketInfo } from 'src/entities/app/CollectionMarketInfo'
import { Currency } from 'src/entities/domain/Currency'
import { parseCollectionTokenRange } from 'src/utils/collections'
import { AuthMode } from '../../types/AuthMode'
import { createNftfiApiFetcher } from '../../factories/nftfiApi/createNftfiApiFetcher'

type ApiResponseCollectionsByContract = {
  pagination: {
    total: number
  }
  results: {
    id: string
    contract: string
    tokenRange: string
    tokenSupply: string
    tokenStandard: string
    name: string
    ranking: number
    imageUrl: string
    whitelisted: boolean
    openseaSlug?: string
    stats: {
      count: number
      totalUsd: number
      averageUsd: number
      averageApr: number
      averageDuration: number
      marketPct: number
    }
    floor?: {
      priceEth?: number
      priceUsd?: number
    }
  }[]
}

const getWhitelistedCollectionsFetcher = createNftfiApiFetcher<ApiResponseCollectionsByContract>({
  authMode: AuthMode.None,
})

// TODO: figure out where to put this (and similar) types
export type GetWhitelistedCollectionsFilters = {
  collections?: CollectionExtended[]
  avgLoanAmount?: {
    min: Amount | null
    max: Amount | null
  }
  totalLoanAmount?: {
    min: Amount | null
    max: Amount | null
  }
}

export type GetWhitelistedCollectionsParams = {
  filters?: GetWhitelistedCollectionsFilters
  sort?: SortParams
  pagination: PaginationParams
}

export async function getWhitelistedCollections(params: GetWhitelistedCollectionsParams) {
  const response = await getWhitelistedCollectionsFetcher({
    url: `/collections?${serializeGetWhitelistedCollectionsParams(params)}`,
  }, null as never)
  return convertWhitelistedCollections(response)
}

function convertWhitelistedCollections(response: ApiResponseCollectionsByContract): EntitiesPaginated<CollectionExtended<CollectionInfo | CollectionStats | CollectionMarketInfo>> {
  return {
    total: response.pagination.total,
    data: response.results.map(result => ({
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
      market: {
        floor: {
          amount: (result.floor?.priceUsd ?? 0) as Amount,
          currency: Currency.USD,
        },
        topOffer: null,
      },
    }))
  }
}

function serializeGetWhitelistedCollectionsParams(params: GetWhitelistedCollectionsParams): string {
  const qs = new URLSearchParams()
  if (params.filters) {
    if (params.filters.collections && params.filters.collections.length > 0) {
    // TODO: wait for BE to support this
      qs.set('ids', params.filters.collections.map(collection => collection.id).join(','))
    }
    if (params.filters.avgLoanAmount?.min) {
      qs.set('loan-avg-usd-min', params.filters.avgLoanAmount.min.toString())
    }
    if (params.filters.avgLoanAmount?.max) {
      qs.set('loan-avg-usd-max', params.filters.avgLoanAmount.max.toString())
    }
    if (params.filters.totalLoanAmount?.min) {
      qs.set('loan-total-usd-min', params.filters.totalLoanAmount.min.toString())
    }
    if (params.filters.totalLoanAmount?.max) {
      qs.set('loan-total-usd-max', params.filters.totalLoanAmount.max.toString())
    }
  }

  if (params.sort) {
    qs.set('sortBy', params.sort.sortBy)
    qs.set('sortDirection', params.sort.sortOrder === SortOrder.ASC
      ? 'asc'
      : 'desc')
  }

  // TODO: ask BE to support 0-indexed pagination.
  // But right now it's not supported by BE, so we add 1 to the page number.
  qs.set('page', (params.pagination.page + 1).toString())
  qs.set('limit', params.pagination.pageSize.toString())

  qs.set('whitelisted', 'true')
  qs.set('projection', 'stats,floor-price')

  return qs.toString()
}
