import { Collection } from 'src/entities/domain/Collection'
import { ExtendWithProp } from 'src/typesUtils'
import { CollectionInfo } from './CollectionInfo'
import { CollectionStats } from './CollectionStats'
import { CollectionMarketInfo } from './CollectionMarketInfo'

type Extensions = CollectionInfo | CollectionStats | CollectionMarketInfo

export type CollectionExtended<Exts extends Extensions = never> = Collection
  & ExtendWithProp<Exts, CollectionInfo, 'info'>
  & ExtendWithProp<Exts, CollectionStats, 'stats'>
  & ExtendWithProp<Exts, CollectionMarketInfo, 'market'>
