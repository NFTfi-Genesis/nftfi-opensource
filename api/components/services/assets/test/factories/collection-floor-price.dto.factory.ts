import { CollectionFloorPriceDto } from '@nftfi.api/facades/assets/dtos';

export const buildCollectionFloorPriceDto = (
  overrides: Partial<CollectionFloorPriceDto> = {}
): CollectionFloorPriceDto => ({
  priceEth: 0.5,
  priceUsd: 1500,
  ...overrides
});
