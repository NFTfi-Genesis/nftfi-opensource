import { Currency } from 'src/entities/domain/Currency'
import { Address } from 'src/entities/base/Address'
import { Wei } from 'src/entities/base/Wei'
import { Seconds } from 'src/entities/base/Seconds'
import { TimestampSeconds } from 'src/entities/base/TimestampSeconds'
import { Percentage } from 'src/entities/base/Percentage'
import { CollectionExtended } from 'src/entities/app/CollectionExtended'
import { CollectionInfo } from 'src/entities/app/CollectionInfo'
import { parseCollectionTokenRange } from 'src/utils/collections'

export type ApiAssetV1 = {
  id: number
  contract: string
  tokenId: string
  name: string
  imageSmallUrl: string
  imageMediumUrl: string
}

export type ApiCollectionV1 = {
  id: number
  contract: string
  tokenRange: string
  name: string
  imageUrl: string
}

export type ApiResponseOfferV1 = {
  id: number
  type: 'asset' | 'collection' | 'contract'
  status: 'active' | 'deleted'
  lender: { address: string, nonce: string }
  borrower?: { address: string }
  collection: ApiCollectionV1
  asset?: ApiAssetV1
  tokenRange: { from: string, to: string }
  signature: string | null
  createdAt: string
  terms: {
    loan: {
      unit: string
      duration: number
      principal: string
      repayment: string
      origination: string
      currency: string
      expiresAt: string
      apr: number
      eapr: number
      prorated: boolean
    }
  }
}

export type OfferBaseV1 = {
  id: string
  dateOffered: Date
  lender: Address
  nonce: string
  borrower?: Address
  signature: string | null
  isDeleted: boolean
  expiry: TimestampSeconds
  terms: {
    duration: Seconds
    repayment: Wei
    principal: Wei
    origination: Wei
    currency: Currency
    isProRated: boolean
    apr: Percentage
    effectiveApr: Percentage
  }
}

export function buildCollectionExtended(result: ApiResponseOfferV1): CollectionExtended<CollectionInfo> {
  return {
    id: result.collection.id.toString(),
    address: result.collection.contract as Address,
    ...parseCollectionTokenRange(result.collection.tokenRange, {
      collectionId: result.collection.id,
    }),
    info: {
      name: result.collection.name,
      imageUri: result.collection.imageUrl,
    },
  }
}

export function convertOfferV1(result: ApiResponseOfferV1, currency: Currency): OfferBaseV1 {
  const loan = result.terms.loan
  return {
    id: result.id.toString(),
    dateOffered: new Date(result.createdAt),
    lender: result.lender.address as Address,
    nonce: result.lender.nonce,
    borrower: result.borrower?.address as Address | undefined,
    signature: result.signature,
    isDeleted: result.status === 'deleted',
    expiry: Math.floor(new Date(loan.expiresAt).getTime() / 1000) as TimestampSeconds,
    terms: {
      duration: loan.duration as Seconds,
      principal: BigInt(loan.principal) as Wei,
      repayment: BigInt(loan.repayment) as Wei,
      origination: BigInt(loan.origination) as Wei,
      currency,
      isProRated: loan.prorated,
      apr: loan.apr as Percentage,
      effectiveApr: loan.eapr as Percentage,
    },
  }
}
