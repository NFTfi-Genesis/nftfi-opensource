import { Collection } from 'src/entities/domain/Collection'
import { Nft } from 'src/entities/domain/Nft'

export function isNft(entity: unknown): entity is Nft {
  return typeof entity === 'object'
    && Boolean(entity)
    && entity !== null
    && 'id' in entity
    && typeof entity.id === 'bigint'
    && 'address' in entity
    && typeof entity.address === 'string'
}

export function isCollection(entity: unknown): entity is Collection {
  return typeof entity === 'object'
    && Boolean(entity)
    && entity !== null
    && 'address' in entity
    && typeof entity.address === 'string'
    && 'start' in entity
    && typeof entity.start === 'bigint'
    && 'end' in entity
    && typeof entity.end === 'bigint'
}
