import { MarketLoanProtocol } from '../market-loan/market-loan.types';
import { Collection } from './collection.entity';

export const COLLECTION_TABLE_NAME = 'collections';

export enum TokenStandard {
  ERC721 = 'erc721',
  ERC1155 = 'erc1155',
  Punks = 'punks'
}

export interface FindFilters {
  contracts?: string[];
  ids?: number[];
  whitelisted?: boolean;
  loanTotalUsdMin?: number;
  loanTotalUsdMax?: number;
  loanAvgUsdMin?: number;
  loanAvgUsdMax?: number;
}

export interface FindByBorrowerFilters {
  protocols?: MarketLoanProtocol[];
}

export type CollectionSortKeys = Pick<Collection, 'releasedAt' | 'ranking'>;

export type CollectionUpdatePayload = Partial<
  Pick<
    Collection,
    'name' | 'imageUrl' | 'openseaSlug' | 'npfSlug' | 'ranking' | 'whitelisted' | 'tokenRangeBegin' | 'tokenRangeEnd'
  >
>;

export type CollectionDraft = Pick<
  Collection,
  | 'name'
  | 'contract'
  | 'tokenRangeBegin'
  | 'tokenRangeEnd'
  | 'tokenStandard'
  | 'ranking'
  | 'whitelisted'
  | 'openseaSlug'
  | 'npfSlug'
  | 'imageUrl'
  | 'releasedAt'
>;
