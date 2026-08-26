import { Test } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import * as RedisSemaphore from 'redis-semaphore';
import { HealthModule } from '@nftfi.api/modules/health';
import { FxRateScheduler } from '../src/fx-rate/fx-rate.scheduler';
import { FxRateService } from '../src/fx-rate/fx-rate.service';

jest.mock('redis-semaphore');

describe(FxRateScheduler.name, () => {
  let scheduler: FxRateScheduler;
  let service: FxRateService;

  beforeEach(async () => {
    jest.resetAllMocks();

    const moduleRef = await Test.createTestingModule({
      imports: [HealthModule],
      providers: [
        FxRateScheduler,
        {
          provide: FxRateService,
          useValue: {
            refreshEthUsdtRate: jest.fn()
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

    scheduler = moduleRef.get(FxRateScheduler);
    service = moduleRef.get(FxRateService);

    jest.spyOn(RedisSemaphore.Mutex.prototype, 'tryAcquire').mockResolvedValue(true);
    jest.spyOn(RedisSemaphore.Mutex.prototype, 'release').mockResolvedValue();
  });

  describe(FxRateScheduler.prototype.handleRefreshEthUsdtRate.name, () => {
    it('calls refreshEthUsdtRate', async () => {
      const fnCall = jest.spyOn(service, 'refreshEthUsdtRate').mockResolvedValue();

      await scheduler.handleRefreshEthUsdtRate();

      expect(fnCall).toHaveBeenCalled();
    });
  });

  describe(FxRateScheduler.prototype.onApplicationBootstrap.name, () => {
    it('triggers refresh on bootstrap', () => {
      const fnCall = jest.spyOn(scheduler, 'handleRefreshEthUsdtRate').mockImplementation();

      scheduler.onApplicationBootstrap();

      expect(fnCall).toHaveBeenCalledTimes(1);
    });
  });
});
