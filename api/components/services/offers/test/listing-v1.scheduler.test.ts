jest.mock('redis-semaphore', () => ({
  Mutex: jest.fn().mockImplementation(() => ({
    tryAcquire: jest.fn().mockResolvedValue(true),
    release: jest.fn().mockResolvedValue(undefined),
    isAcquired: true
  }))
}));

import { Test } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { HealthService } from '@nftfi.api/modules/health';
import { ListingScheduler } from '../src/listing-v1/listing-v1.scheduler';
import { ListingV1Service } from '../src/listing-v1/listing-v1.service';

describe(ListingScheduler.name, () => {
  let scheduler: ListingScheduler;
  let listingService: ListingV1Service;

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [
        ListingScheduler,
        {
          provide: ListingV1Service,
          useValue: { deleteTransferredListings: jest.fn().mockResolvedValue(undefined) }
        },
        {
          provide: CACHE_MANAGER,
          useValue: { store: { client: { keys: jest.fn().mockResolvedValue([]), del: jest.fn() } } }
        },
        {
          provide: HealthService,
          useValue: { on: jest.fn(), off: jest.fn() }
        }
      ]
    }).compile();

    scheduler = moduleRef.get(ListingScheduler);
    listingService = moduleRef.get(ListingV1Service);
  });

  describe(ListingScheduler.prototype.deleteTransferredListings.name, () => {
    it('delegates to listing service', async () => {
      await scheduler.deleteTransferredListings();

      expect(listingService.deleteTransferredListings).toHaveBeenCalledTimes(1);
    });
  });
});
