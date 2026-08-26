import { Nft } from 'src/entities/domain/Nft'
import { AssetOffer, CollectionOffer, ContractOffer, OfferType } from 'src/entities/domain/Offer'
import { Address } from 'src/entities/base/Address'
import { getCurrencyFromAddress } from 'src/utils/currencies'
import { PanicError } from 'src/errors/PanicError'
import { traversePages } from 'src/utils/fetchers'
import { createNftfiApiFetcher, NftfiApiFetcherDependencies } from '../../factories/nftfiApi/createNftfiApiFetcher'
import { AuthMode } from '../../types/AuthMode'
import { ApiResponseOfferV1, buildCollectionExtended, convertOfferV1 } from './convertOfferV1'

const offersFetcher = createNftfiApiFetcher<ApiResponseOfferV1[], AuthMode.Optional>({
  authMode: AuthMode.Optional,
})

export async function getOffersForNft(
  params: Nft,
  deps: NftfiApiFetcherDependencies<AuthMode.Optional>
): Promise<Array<AssetOffer | CollectionOffer | ContractOffer>> {
  const limit = 10
  const response = await traversePages(async page => {
    const data = await offersFetcher(
      {
        url: `/v1/offers?nftContract=${params.address}&nftTokenId=${params.id}&page=${page}&limit=${limit}`,
      },
      deps
    )
    if (!data) {
      return { results: [] }
    }
    return { results: convertOffers(data) }
  }, limit)

  return response.results
}

function convertOffers(data: ApiResponseOfferV1[]): Array<AssetOffer | CollectionOffer | ContractOffer> {
  return data.map(result => {
    const loan = result.terms.loan
    const currency = getCurrencyFromAddress(loan.currency as Address)

    if (!currency) {
      throw new PanicError({ message: `Unknown currency address: ${loan.currency}` })
    }

    const offerBase = convertOfferV1(result, currency)

    if (result.type === 'asset') {
      if (!result.asset) {
        throw new PanicError({ message: 'Asset offer missing asset field', details: { result } })
      }
      return {
        ...offerBase,
        type: OfferType.Asset,
        nft: {
          id: BigInt(result.asset.tokenId),
          address: result.asset.contract as Address,
          info: {
            name: result.asset.name || `#${result.asset.tokenId}`,
            imageUri: result.asset.imageMediumUrl,
          },
          collection: buildCollectionExtended(result),
        },
      }
    }

    if (result.type === 'collection') {
      return {
        ...offerBase,
        type: OfferType.Collection,
        collection: buildCollectionExtended(result),
        tokenRange: {
          from: BigInt(result.tokenRange.from),
          to: BigInt(result.tokenRange.to),
        },
      }
    }

    if (result.type === 'contract') {
      return {
        ...offerBase,
        type: OfferType.Collection,
        contract: result.collection.contract as Address,
        collection: buildCollectionExtended(result),
      }
    }

    throw new PanicError({
      message: `Unknown offer type: ${(result as { type: string }).type} when converting getOffers response`,
      details: { result },
    })
  })
}
