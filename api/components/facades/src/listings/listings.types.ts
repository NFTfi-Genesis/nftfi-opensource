import { ListingDeletedReason } from '@nftfi.api/repositories/postgres/listing';

export enum ListingsQueueTopic {
  DeleteListing = 'listings_delete-listing'
}

export interface DeleteListingPayload {
  nftContract: string;
  nftTokenId: string;
  reason: ListingDeletedReason;
}
