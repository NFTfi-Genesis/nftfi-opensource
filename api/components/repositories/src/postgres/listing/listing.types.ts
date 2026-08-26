import { CollectionAsset } from '../collection-asset';
import { Listing } from './listing.entity';

export const LISTING_TABLE_NAME = 'listings';

export enum ListingPreference {
  HighAmount = 'highAmount',
  LowApr = 'lowApr'
}

export enum ListingDeletedReason {
  UserAction = 'USER_ACTION',
  OwnershipChanged = 'OWNERSHIP_CHANGED',
  LoanStarted = 'LOAN_STARTED'
}

export type FindConditions = {
  borrower?: string;
  currency?: string;
  duration?: number;
  collectionIds?: number[];
  nftContracts?: string[];
};

export type ListingSortKeys = Pick<Listing, 'createdAt'>;

export type DraftListing = Pick<
  Listing,
  'nftContract' | 'nftTokenId' | 'borrower' | 'duration' | 'currency' | 'prorated' | 'preference'
> & { asset: Pick<CollectionAsset, 'id'> };
