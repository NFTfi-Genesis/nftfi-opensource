import { Test } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import * as RedisSemaphore from 'redis-semaphore';
import { HealthModule } from '@nftfi.api/modules/health';
import { LoanNotificationScheduler } from '../src/loan-notification/loan-notification.scheduler';
import { LoanNotificationService } from '../src/loan-notification/loan-notification.service';

jest.mock('redis-semaphore');

describe(LoanNotificationScheduler.name, () => {
  let scheduler: LoanNotificationScheduler;
  let service: LoanNotificationService;

  beforeEach(async () => {
    jest.resetAllMocks();

    const moduleRef = await Test.createTestingModule({
      imports: [HealthModule],
      providers: [
        LoanNotificationScheduler,
        {
          provide: LoanNotificationService,
          useValue: {
            notifyLoansMaturityByBorrower: jest.fn(),
            notifyLoansMaturityByLender: jest.fn()
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

    scheduler = moduleRef.get(LoanNotificationScheduler);
    service = moduleRef.get(LoanNotificationService);

    jest.spyOn(RedisSemaphore.Mutex.prototype, 'tryAcquire').mockResolvedValue(true);
    jest.spyOn(RedisSemaphore.Mutex.prototype, 'release').mockResolvedValue();
  });

  describe(LoanNotificationScheduler.prototype.onLoanIsAlmostDue.name, () => {
    it('notifies borrowers for loans that are almost due', async () => {
      const fnNotify = jest.spyOn(service, 'notifyLoansMaturityByBorrower').mockResolvedValue();

      await scheduler.onLoanIsAlmostDue();

      expect(fnNotify).toHaveBeenCalledTimes(1);
    });
  });

  describe(LoanNotificationScheduler.prototype.onNotifyLoansMaturityByLender.name, () => {
    it('notifies lenders for loans that are almost due', async () => {
      const fnNotify = jest.spyOn(service, 'notifyLoansMaturityByLender').mockResolvedValue();

      await scheduler.onNotifyLoansMaturityByLender();

      expect(fnNotify).toHaveBeenCalledTimes(1);
    });
  });
});
