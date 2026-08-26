import { Nft } from 'src/entities/domain/Nft'
import { Listing } from 'src/entities/domain/Listing'
import { ExtendWithProp } from 'src/typesUtils'
import { Offer } from '../domain/Offer'
import { Collection } from '../domain/Collection'

type Extensions = Nft | Collection | Offer[]

export type ListingExtended<
  Exts extends Extensions = Nft
> = Listing
  & ExtendWithProp<Exts, Nft, 'nft'>
  & ExtendWithProp<Exts, Collection, 'collection'>
  & ExtendWithProp<Exts, Offer[], 'offers'>
