import { Nft } from 'src/entities/domain/Nft'
import { NftExtended } from 'src/entities/app/NftExtended'
import { createNftfiApiFetcher } from 'src/services/factories/nftfiApi/createNftfiApiFetcher'
import { AuthMode } from 'src/services/types/AuthMode'
import { Address } from 'src/entities/base/Address'
import { NftInfo } from 'src/entities/app/NftInfo'
import { CollectionExtended } from 'src/entities/app/CollectionExtended'
import { CollectionInfo } from 'src/entities/app/CollectionInfo'
import { parseCollectionTokenRange } from 'src/utils/collections'

const getNftInfosFetcher = createNftfiApiFetcher<NftfiApiNftInfoResponse, AuthMode.None>({
  authMode: AuthMode.None,
})

export async function enrichNftsWithInfo(nfts: Nft[]): Promise<NftExtended<NftInfo | CollectionExtended<CollectionInfo>>[]> {
  if (nfts.length === 0) {
    return []
  }
  const nftKeys = nfts.map(nft => `${nft.address}-${nft.id}`)
  const nftInfo = await getNftInfosFetcher({
    url: `/assets?keys=${nftKeys.join(',')}`,
  }, null as never)
  if (!nftInfo) {
    return []
  }
  return convertNftfiApiNftInfoResponseToNfts(nftInfo)
}

function convertNftfiApiNftInfoResponseToNfts(nftfiApiNftInfoResponse: NftfiApiNftInfoResponse): NftExtended<NftInfo | CollectionExtended<CollectionInfo>>[] {
  return nftfiApiNftInfoResponse.results.map(result => {

    if (!result?.collection) {
      return convertResultMissingCollectionToNft(result)
    }

    return {
      id: BigInt(result.tokenId),
      address: result.contract as Address,
      info: {
        name: result.name || `#${result.tokenId}`,
        imageUri: result.imageMediumUrl ?? '',
      },
      collection: {
        id: result.collection.id,
        key: `${result.collection.contract}-${BigInt(result.collection.tokenRange.split(':')[0])}` as `${Address}-${bigint}`,
        ...parseCollectionTokenRange(result.collection.tokenRange, {
          collectionId: result.collection.id,
        }),
        address: result.collection.contract as Address,
        info: {
          name: result.collection.name,
          imageUri: result.collection.imageUrl ?? '',
          openseaSlug: result.collection.openseaSlug,
        },
      }
    }
  })
}

// TODO: this is a temp solution when BE fails to return collection info (which should get fixed), then it will fallback to this
function convertResultMissingCollectionToNft(result: NftfiApiNftInfoResponse['results'][number]) {
  return {
    id: BigInt(result.tokenId),
    address: result.contract as Address,
    info: {
      name: result.name || `#${result.tokenId}`,
      imageUri: result.imageMediumUrl ?? '',
    },
    collection: {
      id: result.contract,
      key: `${result.contract}-${BigInt(0)}` as `${Address}-${bigint}`,
      start: BigInt(0),
      end: BigInt(0),
      address: result.contract as Address,
      info: {
        name: result.contract,
        imageUri: result.imageMediumUrl ?? '',
        openseaSlug: undefined,
      },
    }
  }
}

type NftfiApiNftInfoResponse = {
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
    }
  }>
}
