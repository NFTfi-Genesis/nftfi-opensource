import { Collection } from '@nftfi.api/repositories/postgres/collection';

export type CollectionMetadata = Pick<
  Collection,
  'name' | 'ranking' | 'openseaSlug' | 'npfSlug' | 'tokenStandard' | 'tokenRangeBegin' | 'tokenRangeEnd' | 'releasedAt'
>;

export type CollectionLinks = Pick<Collection, 'imageUrl'>;

export interface GetImageUrlOptions {
  timeoutMs?: number;
}
