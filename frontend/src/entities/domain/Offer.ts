import { Address } from 'src/entities/base/Address'
import { Terms } from 'src/entities/domain/Terms'
import { TimestampSeconds } from 'src/entities/base/TimestampSeconds'
import { NftExtended } from 'src/entities/app/NftExtended'
import { NftInfo } from 'src/entities/app/NftInfo'
import { CollectionExtended } from 'src/entities/app/CollectionExtended'
import { CollectionInfo } from 'src/entities/app/CollectionInfo'

export enum OfferType {
  Asset = 'Asset',
  Collection = 'Collection',
}

export enum OfferStatus {
  Active = 'Active',
  Invalid = 'Invalid',
}

export type OfferIvalidReasons = {
  insufficientBalance: boolean
  insufficientAllowance: boolean
  invalidNonce: boolean
  exceedsMaxDuration: boolean
}

export type OfferBase = {
  id: string
  dateOffered: Date
  lender: Address
  nonce: string
  borrower?: Address
  signature: string | null
  type: OfferType
  terms: Terms
  expiry: TimestampSeconds
  isDeleted: boolean
}

export type AssetOffer = OfferBase & {
  type: OfferType.Asset
  nft: NftExtended<NftInfo | CollectionExtended<CollectionInfo>>
}

export type CollectionOffer = OfferBase & {
  type: OfferType.Collection
  collection: CollectionExtended<CollectionInfo>
  // The offer's actual token-id range. Equals the collection's full range for
  // simple "offer on entire collection" offers, but can be a sub-range for
  // custom-range offers. The on-chain signature commits to these values.
  tokenRange: { from: bigint, to: bigint }
  // True for narrowed contract offers
  // as the logic of accepting originally contract offers and collection offers is different
  isContractOfferOriginally?: boolean
}

export type ContractOffer = OfferBase & {
  type: OfferType.Collection
  contract: Address
  // Display-only collection metadata (canonical record picked server-side via
  // getClosestCollectionToTokenId). The offer still applies contract-wide, but
  // this lets the UI render a name/image instead of just the contract address.
  collection: CollectionExtended<CollectionInfo>
}

export type Offer = AssetOffer | CollectionOffer | ContractOffer
