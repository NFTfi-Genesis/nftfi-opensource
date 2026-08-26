import { Collection } from 'src/entities/domain/Collection'
import { CollectionMarketInfo } from 'src/entities/app/CollectionMarketInfo'
import { CollectionExtended } from 'src/entities/app/CollectionExtended'
import { Currency } from 'src/entities/domain/Currency'
import { Amount } from 'src/entities/base/Amount'
import { AuthMode } from '../../types/AuthMode'
import { createNftfiApiFetcher } from '../../factories/nftfiApi/createNftfiApiFetcher'

type ApiResponseCollectionInfo = {
  results: {
    contract: string
    floor: {
      priceEth?: number
      priceUsd?: number
    }
    floorPriceUsd?: number
    name: string
    imageUrl: string
    tokenRange: string
    tokenStandard: string
    ranking?: number
    tokenSupply?: number
  }[]
}

const collectionInfoFetcher = createNftfiApiFetcher<ApiResponseCollectionInfo, AuthMode.None>({
  authMode: AuthMode.None,
})

export async function getCollectionMarketInfo(collection: Collection): Promise<CollectionExtended<CollectionMarketInfo>> {
  const collectionInfoData = await collectionInfoFetcher({
    url: `/collections/${collection.address}`,
  }, null as never)

  return {
    ...collection,
    market: convertCollectionMarketInfo(collectionInfoData),
  }
}

function convertCollectionMarketInfo(data: ApiResponseCollectionInfo | null): CollectionMarketInfo {
  const result = data?.results?.[0]
  const floorPriceEth = result?.floor?.priceEth

  return {
    floor: floorPriceEth != null
      ? {
        amount: floorPriceEth as Amount,
        currency: Currency.WETH,
      }
      : null,
    topOffer: null,
  }
}
