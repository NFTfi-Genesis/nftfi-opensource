import { CollectionFloorPrice } from '../../src/postgres/collection-floor-price';
import { buildCollectionEntity } from './collection.factory';

export const buildCollectionFloorPriceEntity = (overrides: Record<string, unknown> = {}): CollectionFloorPrice =>
  ({
    id: 1,
    collection: buildCollectionEntity(),
    valueEth: 1000,
    valueUsd: 1000,
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-01T12:00:00Z'),
    ...(overrides as object)
  } as CollectionFloorPrice);
