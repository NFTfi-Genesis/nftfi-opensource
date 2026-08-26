import { Address } from 'src/entities/base/Address'
import { CollectionExtended } from 'src/entities/app/CollectionExtended'
import { CollectionInfo } from 'src/entities/app/CollectionInfo'
import { traversePages } from 'src/utils/fetchers'
import { parseCollectionTokenRange } from 'src/utils/collections'
import { AuthMode } from '../../types/AuthMode'
import { createNftfiApiFetcher } from '../../factories/nftfiApi/createNftfiApiFetcher'

type ApiResponseCollectionsByContract = {
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
  }[]
}

const collectionsByContractFetcher = createNftfiApiFetcher<ApiResponseCollectionsByContract>({
  authMode: AuthMode.None,
})

export async function getCollectionsByContract(contract: Address): Promise<Array<CollectionExtended<CollectionInfo>>> {
  const limit = 10
  const response = await traversePages(async page => {
    const data = await collectionsByContractFetcher({
      url: `/collections/${contract}?page=${page}&limit=${limit}`,
    }, null as never)
    if (!data) {
      return { results: [] }
    }
    return { results: data.results }
  }, limit)
  return convertCollectionsByContract(response)
}

function convertCollectionsByContract(response: ApiResponseCollectionsByContract): Array<CollectionExtended<CollectionInfo>> {
  return response.results.map(result => ({
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
  }))
}
