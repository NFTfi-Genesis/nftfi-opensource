import { Collection } from '@nftfi.api/repositories/postgres/collection';
import { CollectionAsset } from '../../src/postgres/collection-asset';

export const buildCollectionAssetEntity = (overrides: Partial<CollectionAsset> = {}): CollectionAsset => ({
  id: 1,
  collection: { id: 1 } as Collection,
  contract: '0x123',
  tokenId: '1',
  name: 'Test Asset',
  imageMediumUrl: 'https://example.com/image-medium.png',
  imageSmallUrl: 'https://example.com/image-small.png',
  createdAt: new Date('2023-01-01'),
  updatedAt: new Date('2023-01-02'),
  ...overrides
});
