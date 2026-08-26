import { Address } from 'src/entities/base/Address'
import { CollectionOffer, ContractOffer, OfferType } from 'src/entities/domain/Offer'
import { PanicError } from 'src/errors/PanicError'
import { getCurrencyFromAddress } from 'src/utils/currencies'
import { traversePages } from 'src/utils/fetchers'
import { Collection } from 'src/entities/domain/Collection'
import { isCollectionOffer, isContractOffer } from 'src/utils/offers'
import { createNftfiApiFetcher, NftfiApiFetcherDependencies } from '../../factories/nftfiApi/createNftfiApiFetcher'
import { AuthMode } from '../../types/AuthMode'
import { tryNarrowContractOffer } from './tryNarrowContractOffer'
import { ApiResponseOfferV1, buildCollectionExtended, convertOfferV1 } from './convertOfferV1'

const offersFetcher = createNftfiApiFetcher<ApiResponseOfferV1[], AuthMode.Optional>({
  authMode: AuthMode.Optional,
})

export async function getOffersForCollection(
  collection: Collection,
  deps: NftfiApiFetcherDependencies<AuthMode.Required>
): Promise<Array<CollectionOffer | ContractOffer>> {
  const limit = 10
  const response = await traversePages(async page => {
    const data = await offersFetcher(
      {
        url: `/v1/offers?collectionIds=${collection.id}&page=${page}&limit=${limit}&typeIn=collection,contract`,
      },
      deps
    )
    if (!data) {
      return { results: [] }
    }
    return { results: convertOffers(data) }
  }, limit)

  const contractOffers = response.results.filter(isContractOffer)
  const collectionOffers = response.results.filter(isCollectionOffer)

  const narrowedContractOffers = (await Promise.all(contractOffers.map(async offer => await tryNarrowContractOffer(offer)))).filter(isCollectionOffer)

  return [...narrowedContractOffers, ...collectionOffers]
}

function convertOffers(data: ApiResponseOfferV1[]): Array<
| CollectionOffer
| ContractOffer
> {
  return data.map(result => {
    const loan = result.terms.loan
    const currency = getCurrencyFromAddress(loan.currency as Address)

    if (!currency) {
      throw new PanicError({ message: `Unknown currency address: ${loan.currency}` })
    }

    const offerBase = convertOfferV1(result, currency)

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
      message: `Unsupported collection offer type: ${(result as { type: string }).type} when converting getOffers response`,
      details: { result },
    })
  })
}
