export enum TokenType {
  ERC721 = 'ERC721'
}

export interface AlchemyNftMetadataImage {
  cachedUrl: string;
  thumbnailUrl: string;
  pngUrl: string;
  contentType: string;
  size: number;
  originalUrl: string;
}

interface OpenseaMetata {
  floorPrice: number;
  collectionName: string;
  collectionSlug: string;
  safelistRequestStatus: 'verified';
  imageUrl: string;
  description: string;
  externalUrl: null;
  twitterUsername: string;
  discordUrl: string;
  bannerImageUrl: string;
  lastIngestedAt: string; // "2025-07-15T11:42:06.000Z"
}

export interface AlchemyNft {
  contract: {
    address: string;
    name: string;
    symbol: string;
    totalSupply: string; // "10000",
    tokenType: TokenType;
    contractDeployer: string; // "0xd45058Bf25BBD8F586124C479D384c8C708CE23A",
    deployedBlockNumber: number;
    openSeaMetadata: OpenseaMetata;
    isSpam: null;
    spamClassifications: [];
  };
  tokenId: string; // "6088",
  tokenType: TokenType;
  name: string; //
  description: null;
  tokenUri: string;
  image: {
    cachedUrl: string;
    thumbnailUrl: string;
    pngUrl: string;
    contentType: string;
    size: number;
    originalUrl: string;
  };
  animation: {
    cachedUrl: null;
    contentType: null;
    size: null;
    originalUrl: null;
  };
  raw: {
    tokenUri: string;
    metadata: string;
    error: null;
  };
  collection: {
    name: string;
    slug: string;
    externalUrl: null;
    bannerImageUrl: string;
  };
  mint: {
    mintAddress: null;
    blockNumber: null;
    timestamp: null;
    transactionHash: null;
  };
  owners: null;
  timeLastUpdated: string; // "2025-07-21T06:18:27.443Z"
}

export interface AlchemyShrunkNft {
  contractAddress: string;
  tokenId: string;
  balance: string;
  isSpam: boolean;
  spamClassifications: string[];
}

export interface AlchemyContract {
  address: string;
  name: string;
  symbol: string;
  totalSupply: string; // "198051"
  tokenType: TokenType;
  contractDeployer: string; // "0x99a9b7c1116f9ceeb1652de04d5969cce509b069"
  deployedBlockNumber: number;
  openSeaMetadata: OpenseaMetata;
}

export interface PaginationOptions {
  limit: number;
  next?: string;
}
