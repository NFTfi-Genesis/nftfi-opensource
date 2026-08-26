import { AlchemyNft, TokenType } from '../../src/alchemy';

export const buildAlchemyNftMetadata = (overrides: Partial<AlchemyNft> = {}): AlchemyNft => ({
  contract: {
    address: '0x1234567890abcdef1234567890abcdef12345678',
    name: 'Test NFT Collection',
    symbol: 'TNFT',
    totalSupply: '10000',
    tokenType: TokenType.ERC721,
    contractDeployer: '0xd45058Bf25BBD8F586124C479D384c8C708CE23A',
    deployedBlockNumber: 12345678,
    openSeaMetadata: {
      floorPrice: 100,
      collectionName: 'Test Collection',
      collectionSlug: 'test-collection',
      safelistRequestStatus: 'verified',
      imageUrl: 'https://example.com/image.png',
      description: 'This is a test NFT collection',
      externalUrl: null,
      twitterUsername: 'testcollection',
      discordUrl: 'https://discord.gg/test',
      bannerImageUrl: 'https://example.com/banner.png',
      lastIngestedAt: '2025-07-15T11:42:06.000Z'
    },
    isSpam: null,
    spamClassifications: []
  },
  tokenId: '1',
  tokenType: TokenType.ERC721,
  name: 'Test NFT',
  description: null,
  tokenUri: 'https://example.com/token/1',
  image: {
    cachedUrl: 'https://example.com/image.png',
    thumbnailUrl: 'https://example.com/image_thumbnail.png',
    contentType: 'image/png',
    size: 12345,
    originalUrl: 'https://example.com/original_image.png',
    pngUrl: 'https://example.com/image.png'
  },
  animation: {
    cachedUrl: null,
    contentType: null,
    size: null,
    originalUrl: null
  },
  raw: {
    tokenUri: 'https://example.com/token/1',
    metadata: '{"image": "https://example.com/image.png", "name": "Test NFT"}',
    error: null
  },
  collection: {
    name: 'Test NFT Collection',
    slug: 'test-nft-collection',
    externalUrl: null,
    bannerImageUrl: 'https://example.com/banner.png'
  },
  mint: {
    mintAddress: null,
    blockNumber: null,
    timestamp: null,
    transactionHash: null
  },
  owners: null,
  timeLastUpdated: '2025-07-21T06:18:27.443Z',
  ...overrides
});
