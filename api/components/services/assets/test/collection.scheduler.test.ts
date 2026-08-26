import { Test } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import * as RedisSemaphore from 'redis-semaphore';
import { HealthModule } from '@nftfi.api/modules/health';
import { CollectionScheduler } from '../src/collection/collection.scheduler';
import { CollectionService } from '../src/collection';

jest.mock('redis-semaphore');

describe(CollectionScheduler.name, () => {
  let scheduler: CollectionScheduler;
  let service: CollectionService;

  beforeEach(async () => {
    jest.resetAllMocks();

    const moduleRef = await Test.createTestingModule({
      imports: [HealthModule],
      providers: [
        CollectionScheduler,
        {
          provide: CollectionService,
          useValue: {
            validateAndRefreshLinks: jest.fn(),
            updateMissingImageUrls: jest.fn(),
            updateMissingNpfSlugs: jest.fn(),
            updateTokenRanges: jest.fn(),
            updateAllRankings: jest.fn()
          }
        },
        {
          provide: CACHE_MANAGER,
          useValue: {
            store: {
              client: {
                set: jest.fn(),
                get: jest.fn()
              }
            }
          }
        }
      ]
    }).compile();

    scheduler = moduleRef.get(CollectionScheduler);
    service = moduleRef.get(CollectionService);

    jest.spyOn(RedisSemaphore.Mutex.prototype, 'tryAcquire').mockResolvedValue(true);
    jest.spyOn(RedisSemaphore.Mutex.prototype, 'release').mockResolvedValue();
  });

  describe(CollectionScheduler.prototype.handleValidateAndRefreshLinks.name, () => {
    it('calls validateAndRefreshLinks', async () => {
      const fnCall = jest.spyOn(service, 'validateAndRefreshLinks').mockResolvedValue();

      await scheduler.handleValidateAndRefreshLinks();

      expect(fnCall).toHaveBeenCalled();
    });
  });

  describe(CollectionScheduler.prototype.handleUpdateTokenRanges.name, () => {
    it('calls updateTokenRanges', async () => {
      const fnCall = jest.spyOn(service, 'updateTokenRanges').mockResolvedValue();

      await scheduler.handleUpdateTokenRanges();
      expect(fnCall).toHaveBeenCalled();
    });
  });

  describe(CollectionScheduler.prototype.handleUpdateAllRankings.name, () => {
    it('calls updateAllRankings', async () => {
      const fnCall = jest.spyOn(service, 'updateAllRankings').mockResolvedValue();

      await scheduler.handleUpdateAllRankings();

      expect(fnCall).toHaveBeenCalled();
    });
  });

  describe(CollectionScheduler.prototype.handleUpdateMissingImageUrls.name, () => {
    it('calls updateMissingImageUrls', async () => {
      const fnCall = jest.spyOn(service, 'updateMissingImageUrls').mockResolvedValue();

      await scheduler.handleUpdateMissingImageUrls();

      expect(fnCall).toHaveBeenCalled();
    });
  });

  describe(CollectionScheduler.prototype.handleUpdateMissingNpfSlugs.name, () => {
    it('calls updateMissingNpfSlugs', async () => {
      const fnCall = jest.spyOn(service, 'updateMissingNpfSlugs').mockResolvedValue();

      await scheduler.handleUpdateMissingNpfSlugs();

      expect(fnCall).toHaveBeenCalled();
    });
  });
});
