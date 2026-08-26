import { Address } from 'src/entities/base/Address'
import { Days } from 'src/entities/base/Days'
import { NftfiCurrency } from 'src/entities/domain/NftfiCurrency'
import { PanicError } from 'src/errors/PanicError'
import { createNftfiApiFetcher, NftfiApiFetcherDependencies } from 'src/services/factories/nftfiApi/createNftfiApiFetcher'
import { AuthMode } from 'src/services/types/AuthMode'
import { getCurrencyAddress, getCurrencyFromAddress, isNftfiCurrency } from 'src/utils/currencies'
import { getLoanTermsPreferenceFromString } from 'src/utils/listings'
import { parseCollectionTokenRange } from 'src/utils/collections'
import { CollectionExtended } from 'src/entities/app/CollectionExtended'
import { CollectionId } from 'src/entities/domain/Collection'
import { CollectionInfo } from 'src/entities/app/CollectionInfo'
import { ListingExtended } from 'src/entities/app/ListingExtended'
import { NftExtended } from 'src/entities/app/NftExtended'
import { NftInfo } from 'src/entities/app/NftInfo'
import { SortOrder, SortParams } from '../../../entities/app/SortParams'
import { PaginationParams } from '../../../entities/app/PaginationParams'
import { EntitiesPaginated } from '../../../entities/utils/EntitiesPaginated'

const SECONDS_PER_DAY = 86400

type NftfiApiListing = {
  id: number
  borrower: string
  currency: string | null
  duration: number
  prorated: boolean | null
  preference: 'highAmount' | 'lowApr'
  createdAt: string
  asset: {
    id: number
    contract: string
    tokenId: string
    name: string
    imageMediumUrl: string
    collection: {
      id: number
      contract: string
      tokenRange: `${number}` | `${number}:${number}`
      name: string
      imageUrl: string
      openseaSlug?: string
    }
  }
}

type NftfiApiGetListingsResponse = NftfiApiListing[]

const getListingsFetcher = createNftfiApiFetcher<NftfiApiGetListingsResponse, AuthMode.None, true>({
  authMode: AuthMode.None,
  includeHeaders: true,
})

export type ListingsFilters = {
  collections: CollectionExtended<CollectionInfo>[]
  borrower: Address | null
  currency: NftfiCurrency | null
  duration: number | null
}

export enum ListingsSortBy {
  listedDate = 'createdAt',
}

export type GetListingsParams = {
  filters?: ListingsFilters
  sort?: SortParams<ListingsSortBy>
  pagination?: PaginationParams
}

export type ListingsFetcherResult = ListingExtended<NftExtended<NftInfo | CollectionExtended<CollectionInfo>>>

export async function getListings(
  params: GetListingsParams,
  dependencies: NftfiApiFetcherDependencies<AuthMode.None>,
): Promise<EntitiesPaginated<ListingsFetcherResult>> {
  const effectiveParams: GetListingsParams = {
    ...params,
    pagination: params.pagination ?? {
      page: 1,
      pageSize: 50,
    },
  }

  const query = buildQueryString(effectiveParams)
  const { data: response, headers } = await getListingsFetcher({
    url: `/v1/listings${query}`,
  }, dependencies)

  const totalHeader = headers.get('x-pagination-total')
  const total = totalHeader
    ? parseInt(totalHeader, 10)
    : response.length

  return {
    data: convertListings(response),
    total,
  }
}

function convertListings(data: NftfiApiGetListingsResponse): ListingsFetcherResult[] {
  return data.map(listing => ({
    nft: {
      id: BigInt(listing.asset.tokenId),
      address: listing.asset.contract as Address,
      info: {
        name: listing.asset.name || `#${listing.asset.tokenId}`,
        imageUri: listing.asset.imageMediumUrl ?? '',
      },
      collection: {
        id: String(listing.asset.collection.id),
        key: `${listing.asset.collection.contract as Address}-${BigInt(listing.asset.collection.tokenRange.split(':')[0])}` as `${Address}-${bigint}`,
        ...parseCollectionTokenRange(listing.asset.collection.tokenRange, {
          collectionId: listing.asset.collection.id,
        }),
        address: listing.asset.collection.contract as Address,
        info: {
          name: listing.asset.collection.name,
          imageUri: listing.asset.collection.imageUrl ?? '',
          openseaSlug: listing.asset.collection.openseaSlug,
        },
      },
    },
    borrower: listing.borrower as Address,
    desiredTerms: {
      duration: Math.round(listing.duration / SECONDS_PER_DAY) as Days,
      currency: listing.currency
        ? (() => {
          const currency = getCurrencyFromAddress(listing.currency as Address)
          if (!currency || !isNftfiCurrency(currency)) {
            throw new PanicError({
              message: `Non NFTfi supported currency in listing: ${listing.currency}`,
              details: {
                listing,
              },
            })
          }
          return currency
        })()
        : null,
      isProRated: listing.prorated,
      preference: getLoanTermsPreferenceFromString(listing.preference),
    },
    listedDate: new Date(listing.createdAt),
  }))
}

function buildQueryString(params: GetListingsParams): string {
  const qs = new URLSearchParams()

  if (params.pagination) {
    qs.set('page', String(params.pagination.page))
    qs.set('limit', String(params.pagination.pageSize))
  }

  if (params.sort) {
    qs.set('sortBy', params.sort.sortBy)
    qs.set('sortDirection', params.sort.sortOrder === SortOrder.ASC ? 'asc' : 'desc')
  }

  if (params.filters) {
    if (params.filters.borrower !== null) {
      qs.set('borrower', params.filters.borrower.toLowerCase())
    }
    if (params.filters.currency !== null) {
      qs.set('currency', getCurrencyAddress(params.filters.currency).toLowerCase())
    }
    if (params.filters.duration !== null) {
      qs.set('duration', String(params.filters.duration * SECONDS_PER_DAY))
    }
    if (params.filters.collections.length > 0) {
      const collectionIds = params.filters.collections
        .map(collection => collection.id)
        .filter((id): id is CollectionId => id !== undefined)
      if (collectionIds.length > 0) {
        qs.set('collectionIds', collectionIds.join(','))
      }
    }
  }

  const str = qs.toString()
  return str ? `?${str}` : ''
}
