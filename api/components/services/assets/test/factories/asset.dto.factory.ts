import { AssetDto } from '@nftfi.api/facades/assets';
import { buildCollectionDto } from './collection.dto.factory';

export const buildAssetDto = (overrides: Partial<AssetDto> = {}): AssetDto => ({
  id: 1,
  contract: '0x1234567890abcdef1234567890abcdef12345678',
  owners: ['0x000000000000000000000000000000000000000000'],
  tokenId: '1',
  name: 'Test Asset',
  imageMediumUrl: 'https://example.com/medium.png',
  imageSmallUrl: 'https://example.com/small.png',
  collection: buildCollectionDto(overrides.collection),
  ...overrides
});
