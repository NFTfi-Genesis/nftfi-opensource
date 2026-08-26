import { Test } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import * as RedisSemaphore from 'redis-semaphore';
import { HealthModule } from '@nftfi.api/modules/health';
import { OfferV1Scheduler, OfferV1Service } from '../src/offer-v1';

jest.mock('redis-semaphore');

describe(OfferV1Scheduler.name, () => {
  let scheduler: OfferV1Scheduler;
  let service: jest.Mocked<Pick<OfferV1Service, 'deleteExpired'>>;

  beforeEach(async () => {
    jest.resetAllMocks();

    service = { deleteExpired: jest.fn().mockResolvedValue(undefined) };

    const moduleRef = await Test.createTestingModule({
      imports: [HealthModule],
      providers: [
        OfferV1Scheduler,
        { provide: OfferV1Service, useValue: service },
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

    scheduler = moduleRef.get(OfferV1Scheduler);

    jest.spyOn(RedisSemaphore.Mutex.prototype, 'tryAcquire').mockResolvedValue(true);
    jest.spyOn(RedisSemaphore.Mutex.prototype, 'release').mockResolvedValue();
  });

  describe(OfferV1Scheduler.prototype.onDeleteExpired.name, () => {
    it('delegates to the v1 service when the mutex is acquired', async () => {
      await scheduler.onDeleteExpired();

      expect(service.deleteExpired).toHaveBeenCalledTimes(1);
    });

    it('skips work when the mutex cannot be acquired', async () => {
      jest.spyOn(RedisSemaphore.Mutex.prototype, 'tryAcquire').mockResolvedValue(false);

      await scheduler.onDeleteExpired();

      expect(service.deleteExpired).not.toHaveBeenCalled();
    });
  });
});
