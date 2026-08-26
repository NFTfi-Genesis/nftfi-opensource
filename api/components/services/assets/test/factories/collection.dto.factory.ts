import { TokenStandard } from '@nftfi.api/repositories/postgres/collection';
import { CollectionDto } from '@nftfi.api/facades/assets';

export const buildCollectionDto = (overrides: Partial<CollectionDto> = {}): CollectionDto => ({
  id: 1,
  contract: '0x1234567890abcdef1234567890abcdef12345678',
  name: 'Test Collection',
  ranking: 1,
  imageUrl: 'https://example.com/image.png',
  tokenRange: '1000:1999',
  tokenSupply: '1000',
  tokenStandard: TokenStandard.ERC721,
  whitelisted: true,
  stats: null,
  floor: null,
  ...overrides
});
