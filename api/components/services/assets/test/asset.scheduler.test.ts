import { Test } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import * as RedisSemaphore from 'redis-semaphore';
import { HealthModule } from '@nftfi.api/modules/health';
import { AssetScheduler } from '../src/asset/asset.scheduler';
import { AssetService } from '../src/asset/asset.service';

jest.mock('redis-semaphore');

describe(AssetScheduler.name, () => {
  let scheduler: AssetScheduler;
  let service: AssetService;

  beforeEach(async () => {
    jest.resetAllMocks();

    const moduleRef = await Test.createTestingModule({
      imports: [HealthModule],
      providers: [
        AssetScheduler,
        {
          provide: AssetService,
          useValue: {
            updateMissingInMarketLoans: jest.fn(),
            fulfillEmptyLinks: jest.fn(),
            validateAndRefreshLinks: jest.fn(),
            updateMissingImageUrls: jest.fn(),
            updateProjects: jest.fn()
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

    scheduler = moduleRef.get(AssetScheduler);
    service = moduleRef.get(AssetService);

    jest.spyOn(RedisSemaphore.Mutex.prototype, 'tryAcquire').mockResolvedValue(true);
    jest.spyOn(RedisSemaphore.Mutex.prototype, 'release').mockResolvedValue();
  });

  describe(AssetScheduler.prototype.handleEmptyAssets.name, () => {
    it('calls method', async () => {
      const fnCall = jest.spyOn(service, 'validateAndRefreshLinks').mockResolvedValue();

      await scheduler.handleEmptyAssets();

      expect(fnCall).toHaveBeenCalled();
    });
  });

  describe(AssetScheduler.prototype.handleUpdateMissingImageUrls.name, () => {
    it('calls method', async () => {
      const fnCall = jest.spyOn(service, 'updateMissingImageUrls').mockResolvedValue();

      await scheduler.handleUpdateMissingImageUrls();

      expect(fnCall).toHaveBeenCalled();
    });
  });
});
