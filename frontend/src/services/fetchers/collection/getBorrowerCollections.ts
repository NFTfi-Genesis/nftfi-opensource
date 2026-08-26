import { CollectionExtended } from 'src/entities/app/CollectionExtended'
import { CollectionInfo } from 'src/entities/app/CollectionInfo'
import { EntitiesPaginated } from 'src/entities/utils/EntitiesPaginated'
import { Address } from 'src/entities/base/Address'
import { PaginationParams } from 'src/entities/app/PaginationParams'
import { Protocol } from 'src/entities/domain/Protocol'
import { ProtocolApiKeys } from 'src/utils/protocols'
import { parseCollectionTokenRange } from 'src/utils/collections'
import { traversePages } from 'src/utils/fetchers'
import { AuthMode } from '../../types/AuthMode'
import { createNftfiApiFetcher } from '../../factories/nftfiApi/createNftfiApiFetcher'

type ApiBorrowerCollection = {
  id: number
  contract: string
  tokenRange: string
  tokenSupply: string
  tokenStandard: string
  name: string
  ranking: number
  imageUrl: string
  whitelisted: boolean
  openseaSlug?: string
  floor: {
    priceEth?: number
    priceUsd?: number
  } | null
  stats: unknown | null
}

type ApiBorrowerCollectionsResponse = ApiBorrowerCollection[]

const borrowerCollectionsFetcher = createNftfiApiFetcher<ApiBorrowerCollectionsResponse, AuthMode.None, true>({
  authMode: AuthMode.None,
  includeHeaders: true,
})

export type GetBorrowerCollectionsParams = {
  borrower: Address
  protocols?: Protocol[]
  pagination?: PaginationParams
}

function serializeGetBorrowerCollectionsParams(page: number, limit: number, protocols?: Protocol[]): string {
  const qs = new URLSearchParams()

  qs.set('page', page.toString())
  qs.set('limit', limit.toString())

  if (protocols && protocols.length > 0) {
    qs.set('protocols', protocols.map(p => ProtocolApiKeys[p]).join(','))
  }

  return qs.toString()
}

const BORROWER_COLLECTIONS_MAX_PAGE_SIZE = 200

export async function getBorrowerCollections(params: GetBorrowerCollectionsParams): Promise<EntitiesPaginated<CollectionExtended<CollectionInfo>>> {
  const limit = Math.min(params.pagination?.pageSize ?? BORROWER_COLLECTIONS_MAX_PAGE_SIZE, BORROWER_COLLECTIONS_MAX_PAGE_SIZE)
  const startPage = params.pagination?.page ?? 0

  const collections = await traversePages(async page => {
    const apiPage = page + 1
    const queryString = serializeGetBorrowerCollectionsParams(apiPage, limit, params.protocols)

    const response = await borrowerCollectionsFetcher({
      url: `/v1/borrowers/${params.borrower}/collections?${queryString}`,
    }, null as never)

    return { results: response.data }
  }, limit, startPage)

  const converted = convertBorrowerCollections(collections.results)

  return {
    data: converted,
    total: converted.length,
  }
}

function convertBorrowerCollections(data: ApiBorrowerCollectionsResponse): CollectionExtended<CollectionInfo>[] {
  return data.map(collection => ({
    id: collection.id.toString(),
    address: collection.contract as Address,
    ...parseCollectionTokenRange(collection.tokenRange, {
      collectionId: collection.id,
    }),
    info: {
      name: collection.name,
      imageUri: collection.imageUrl,
      openseaSlug: collection.openseaSlug,
    },
  }))
}
