import { Collection, TokenStandard } from '../../src/postgres/collection';

export const buildCollectionEntity = (overrides: Partial<Collection> = {}): Collection => {
  const entity = {
    id: 1,
    contract: '0x123',
    tokenRangeBegin: '1',
    tokenRangeEnd: '2',
    tokenStandard: TokenStandard.ERC721,
    name: 'Collection Name',
    npfSlug: 'npf',
    openseaSlug: 'opensea',
    imageUrl: 'https://example.com/collection-image.png',
    whitelisted: true,
    ranking: 1,
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-02'),
    releasedAt: new Date('2022-01-01'),
    ...(overrides as object)
  } as Collection;
  return {
    tokenRange: [entity.tokenRangeBegin, entity.tokenRangeEnd] as [string, string],
    ...entity
  };
};
