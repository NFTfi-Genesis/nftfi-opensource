export interface GetProjectsOptions {
  page: number;
  limit: number;
  blockchains: BlockchainNetwork[];
}

export interface GetHistoricalPricesOptions {
  start: Date;
  end: Date;
}

export type BlockchainNetwork = 'ethereum' | 'solana';
export type NativeCurrency = 'eth' | 'sol';

export interface SalesTemporality {
  lowest: {
    val24h: number;
    diff24h: number;
    val7d: number;
    diff7d: number;
    val30d: number;
    diff30d: number;
    val90d: number;
    diff90d: number;
  };
  highest: {
    val24h: number;
    diff24h: number;
    val7d: number;
    diff7d: number;
    val30d: number;
    diff30d: number;
    val90d: number;
    diff90d: number;
  };
  average: {
    val24h: number;
    diff24h: number;
    val7d: number;
    diff7d: number;
    val30d: number;
    diff30d: number;
    val90d: number;
    diff90d: number;
  };
  volume: {
    val24h: number;
    diff24h: number;
    val7d: number;
    diff7d: number;
    val30d: number;
    diff30d: number;
    val90d: number;
    diff90d: number;
  };
  count: {
    val24h: number;
    diff24h: number;
    val7d: number;
    diff7d: number;
    val30d: number;
    diff30d: number;
    val90d: number;
    diff90d: number;
  };
}

export interface FloorTemporality {
  diff24h: number;
  diff7d: number;
  diff14d: number;
  diff30d: number;
  diff90d: number;
}

export interface FloorInfo {
  currentFloorNative: number;
  currentFloorOrigin: string;
  currentFloorUsd: number;
  latestFloorTs: number;
  marketplaceSlug: string;
  tokenInfo: {
    blockchain: BlockchainNetwork;
    tokenId: string; // '462000092';
    contract: string; // '0x99a9b7c1116f9ceeb1652de04d5969cce509b069';
    source: string; // 'opensea';
  };
  nativeCurrency: NativeCurrency;
}

interface ProjectStats {
  id: number;
  projectId: number;
  slug: string;
  totalSupply: number;
  listedCount: number;
  totalOwners: number;
  floorInfo: FloorInfo;
  floorCapUsd: number;
  floorCapNative: number;
  floorTemporalityUsd: FloorTemporality;
  floorTemporalityNative: FloorTemporality;
  salesTemporalityUsd: SalesTemporality;
  salesTemporalityNative: SalesTemporality;
  updatedAt: string; // "2025-06-27T10:01:09.783Z",
  nativeCurrency: NativeCurrency;
}

export interface NpfProject {
  name: string;
  slug: string;
  ranking: number;
  imageBlur: string;
  stats: ProjectStats;
  creator?: { name: string; slug: string };
  parentCollection: { name: string; slug: string };
  subCollection: { name: string; slug: string };
  types: 'art' | 'avatar' | 'utility'[];
  blockchain: BlockchainNetwork;
  nativeCurrency: NativeCurrency;
  bestPriceUrl: string; // "https://opensea.io/assets/ethereum/0x99a9b7c1116f9ceeb1652de04d5969cce509b069/462000092",
  updatedAt: string; // "2025-06-27T10:01:09.783Z",
  providerCollectionId?: string; // "0x99a9b7c1116f9ceeb1652de04d5969cce509b069:462000000:462999999"
}

export interface ProjectDetails {
  stats: ProjectStats;
  details: {
    releaseDate: string; // '2021-11-30';
    totalSupply: number; // 10000;
    socialMedia: { name: string; url: string }[];
    contract: string; // '0xbDdE08BD57e5C9fD563eE7aC61618CB2ECdc0ce0';
    textEn?: string;
    textEs?: string;
    floorPriceNative: number; // 0.06999;
    floorPriceUsd: number; // 186.5765424;
    floorInfo: FloorInfo;
    marketplaces: { name: string; url: string }[];
    bestPriceUrl: string; // 'https://opensea.io/assets/ethereum/0xbdde08bd57e5c9fd563ee7ac61618cb2ecdc0ce0/5000575';
    creatorsFee: null;
    creatorsFeePayoutAddress: null;
    mintPriceNative: null;
    mintPriceUsd: null;
    topBid: {
      source: string; // 'opensea';
      native: number; // 10.29;
      usd: number; // 25073.39019;
    };
  } & Pick<
    NpfProject,
    | 'name'
    | 'slug'
    | 'ranking'
    | 'types'
    | 'blockchain'
    | 'nativeCurrency'
    | 'imageBlur'
    | 'providerCollectionId'
    | 'creator'
    | 'parentCollection'
    | 'subCollection'
  >;
}

export interface ProjectsAndMeta {
  projects: NpfProject[];
  page: 1;
  count: number;
  total: number;
}

export type ProjectPrice = Pick<NpfProject, 'slug' | 'nativeCurrency'> & {
  timestamp: number;
  lowestUsd: number;
  lowestNative: number;
};
