import { Nft } from 'src/entities/domain/Nft'
import { Listing } from 'src/entities/domain/Listing'
import { Collection } from 'src/entities/domain/Collection'
import { Offer } from 'src/entities/domain/Offer'
import { ExtendWithProp } from 'src/typesUtils'
import { NftInfo } from './NftInfo'
import { NftMarketInfo } from './NftMarketInfo'

type Extensions = NftInfo | Collection | Listing | Offer[] | NftMarketInfo

export type NftExtended<Exts extends Extensions = never> = Nft
  & ExtendWithProp<Exts, NftInfo, 'info'>
  & ExtendWithProp<Exts, Collection, 'collection'>
  & ExtendWithProp<Exts, Listing, 'listing', { Required: false }>
  & ExtendWithProp<Exts, Offer[], 'offers'>
  & ExtendWithProp<Exts, NftMarketInfo, 'marketInfo'>
