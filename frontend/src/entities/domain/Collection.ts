import { Address } from 'src/entities/base/Address'

export type CollectionId = string

export type Collection = {
  id: CollectionId
  address: Address
  start: bigint
  end: bigint
}
