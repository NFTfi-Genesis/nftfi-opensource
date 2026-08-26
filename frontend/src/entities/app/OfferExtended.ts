import { AssetOffer, CollectionOffer, ContractOffer, Offer } from 'src/entities/domain/Offer'
import { CollectionStats } from 'src/entities/app/CollectionStats'
import { ExtendWithProp, ExtendWithProps } from 'src/typesUtils'
import { OfferValidated } from './OfferValidated'

type OfferExtensions = OfferValidated | CollectionStats

export type OfferExtended<
  Exts extends OfferExtensions = never
> = Offer
  & ExtendWithProps<Exts, OfferValidated>
  & ExtendWithProp<Exts, CollectionStats, 'collectionStats'>

type AssetOfferExtensions = OfferValidated

export type AssetOfferExtended<
  Exts extends AssetOfferExtensions = never
> = AssetOffer
  & ExtendWithProps<Exts, OfferValidated>

type CollectionOfferExtensions = OfferValidated

export type CollectionOfferExtended<
  Exts extends CollectionOfferExtensions = never
> = CollectionOffer
  & ExtendWithProps<Exts, OfferValidated>

type ContractOfferExtensions = OfferValidated

export type ContractOfferExtended<
  Exts extends ContractOfferExtensions = never
> = ContractOffer
  & ExtendWithProps<Exts, OfferValidated>
