import { Listing, ListingPreference } from '@nftfi.api/repositories/postgres/listing';

export const buildListingEntity = (overrides: Partial<Listing> = {}): Listing =>
  ({
    id: 1,
    nftContract: '0x8a90cab2b38dba80c64b7734e58ee1db38b8992e',
    nftTokenId: '7332',
    borrower: '0x5f79bd35435a7b98493543db0fec7f55292e9e77',
    currency: null,
    duration: 604800,
    prorated: null,
    preference: ListingPreference.LowApr,
    asset: { id: 1 },
    deletedAt: null,
    deletedReason: null,
    createdAt: new Date('2026-04-13T10:00:00Z'),
    updatedAt: new Date('2026-04-13T10:00:00Z'),
    ...overrides
  } as Listing);
