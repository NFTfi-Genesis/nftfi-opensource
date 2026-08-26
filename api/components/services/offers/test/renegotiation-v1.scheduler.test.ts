import { Test } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import * as RedisSemaphore from 'redis-semaphore';
import { HealthModule } from '@nftfi.api/modules/health';
import { RenegotiationV1Scheduler, RenegotiationV1Service } from '../src/renegotiation-v1';

jest.mock('redis-semaphore');

describe(RenegotiationV1Scheduler.name, () => {
  let scheduler: RenegotiationV1Scheduler;
  let service: jest.Mocked<Pick<RenegotiationV1Service, 'markExpired'>>;

  beforeEach(async () => {
    jest.resetAllMocks();

    service = { markExpired: jest.fn().mockResolvedValue(undefined) };

    const moduleRef = await Test.createTestingModule({
      imports: [HealthModule],
      providers: [
        RenegotiationV1Scheduler,
        { provide: RenegotiationV1Service, useValue: service },
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

    scheduler = moduleRef.get(RenegotiationV1Scheduler);

    jest.spyOn(RedisSemaphore.Mutex.prototype, 'tryAcquire').mockResolvedValue(true);
    jest.spyOn(RedisSemaphore.Mutex.prototype, 'release').mockResolvedValue();
  });

  describe(RenegotiationV1Scheduler.prototype.onMarkExpired.name, () => {
    it('delegates to the v1 service when the mutex is acquired', async () => {
      await scheduler.onMarkExpired();

      expect(service.markExpired).toHaveBeenCalledTimes(1);
    });

    it('skips work when the mutex cannot be acquired', async () => {
      jest.spyOn(RedisSemaphore.Mutex.prototype, 'tryAcquire').mockResolvedValue(false);

      await scheduler.onMarkExpired();

      expect(service.markExpired).not.toHaveBeenCalled();
    });
  });
});
