import {
  FloorTemporality,
  NpfProject as Project,
  ProjectDetails,
  ProjectPrice,
  SalesTemporality
} from '../../src/nft-price-floor/nft-price-floor.types';

const buildSalesTemporality = (overrides: Partial<SalesTemporality> = {}): SalesTemporality => ({
  average: {
    val24h: 0,
    val30d: 0,
    val7d: 0,
    val90d: 1,
    diff24h: 0,
    diff7d: 0,
    diff30d: 0,
    diff90d: 1
  },
  count: {
    val24h: 0,
    val30d: 0,
    val7d: 0,
    val90d: 1,
    diff24h: 0,
    diff7d: 0,
    diff30d: 0,
    diff90d: 1
  },
  highest: {
    val24h: 0,
    val30d: 0,
    val7d: 0,
    val90d: 1,
    diff24h: 0,
    diff7d: 0,
    diff30d: 0,
    diff90d: 1
  },
  lowest: {
    val24h: 0,
    val30d: 0,
    val7d: 0,
    val90d: 1,
    diff24h: 0,
    diff7d: 0,
    diff30d: 0,
    diff90d: 1
  },
  volume: {
    val24h: 0,
    val30d: 0,
    val7d: 0,
    val90d: 1,
    diff24h: 0,
    diff7d: 0,
    diff30d: 0,
    diff90d: 1
  },
  ...overrides
});

export const buildFloorTemporality = (overrides: Partial<FloorTemporality> = {}): FloorTemporality => ({
  diff24h: 0,
  diff7d: 0,
  diff14d: 0,
  diff30d: 0,
  diff90d: 1,
  ...overrides
});

export const buildProjectStats = (overrides: Partial<Project['stats']> = {}): Project['stats'] => ({
  projectId: 123,
  slug: 'default-project',
  listedCount: 100,
  totalOwners: 50,
  totalSupply: 10000,
  updatedAt: '2023-10-01T00:00:00Z',
  salesTemporalityUsd: buildSalesTemporality(overrides.salesTemporalityUsd),
  salesTemporalityNative: buildSalesTemporality(overrides.salesTemporalityNative),
  floorTemporalityNative: buildFloorTemporality(overrides.floorTemporalityNative),
  floorTemporalityUsd: buildFloorTemporality(overrides.floorTemporalityUsd),
  nativeCurrency: 'eth',
  id: 984,
  floorCapNative: 11100000,
  floorCapUsd: 1000000,
  floorInfo: {
    currentFloorNative: 1000000,
    currentFloorUsd: 100000,
    marketplaceSlug: 'opensea',
    currentFloorOrigin: 'opensea',
    latestFloorTs: 1900000000,
    nativeCurrency: 'eth',
    tokenInfo: {
      contract: '0xdadb0d80178819f2319190d340ce9a924f783711',
      blockchain: 'ethereum',
      source: 'opensea',
      tokenId: '99999'
    }
  },
  ...overrides
});

export const buildProject = (overrides: Partial<Project> = {}): Project => ({
  name: 'Default Project',
  slug: 'default-project',
  ranking: 0,
  providerCollectionId: '0xdadb0d80178819f2319190d340ce9a924f783711:0:99999',
  bestPriceUrl: 'https://example.com/best-price',
  blockchain: 'ethereum',
  nativeCurrency: 'eth',
  types: ['utility'],
  subCollection: {
    name: 'Default SubCollection',
    slug: 'default-subcollection'
  },
  imageBlur: 'default-image-blur',
  parentCollection: {
    name: 'Default Parent Collection',
    slug: 'default-parent-collection'
  },
  updatedAt: '2023-10-01T00:00:00Z',
  stats: buildProjectStats(overrides.stats),
  ...overrides
});

export const buildProjectDetails = (overrides: Partial<ProjectDetails> = {}): ProjectDetails => ({
  stats: buildProjectStats(overrides.stats),
  details: {
    ...buildProject(overrides.details),
    releaseDate: '2022-01-01',
    totalSupply: 10000,
    socialMedia: [{ name: '213', url: '' }],
    contract: '0xdadb0d80178819f2319190d340ce9a924f783711',
    floorPriceNative: 1000000,
    floorPriceUsd: 100000,
    bestPriceUrl: 'https://example.com/best-price',
    imageBlur: 'default-image-blur',
    floorInfo: {
      currentFloorNative: 1000000,
      currentFloorUsd: 100000,
      marketplaceSlug: 'opensea',
      currentFloorOrigin: 'opensea',
      latestFloorTs: 1900000000,
      nativeCurrency: 'eth',
      tokenInfo: {
        contract: '0xdadb0d80178819f2319190d340ce9a924f783711',
        blockchain: 'ethereum',
        source: 'opensea',
        tokenId: '99999'
      }
    },
    marketplaces: [],
    creatorsFee: null,
    creatorsFeePayoutAddress: null,
    mintPriceNative: null,
    mintPriceUsd: null,
    topBid: {
      source: 'opensea',
      native: 10.29,
      usd: 25073.39019
    },
    ...overrides.details
  },
  ...overrides
});

export const buildProjectPrice = (overrides: Partial<ProjectPrice> = {}): ProjectPrice => ({
  slug: 'default-project',
  timestamp: new Date('2023-10-01T00:00:00Z').getTime() * 1000,
  lowestUsd: 100000,
  lowestNative: 1000000,
  nativeCurrency: 'eth',
  ...overrides
});
