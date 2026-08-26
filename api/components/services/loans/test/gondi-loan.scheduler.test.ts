import { Logger } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { ScheduleModule } from '@nestjs/schedule';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import * as RedisSemaphore from 'redis-semaphore';
import { HealthModule } from '@nftfi.api/modules/health';
import { MarketLoanProtocol } from '@nftfi.api/repositories/postgres/market-loan';
import { GondiLoanScheduler } from '../src/subscribers/gondi/gondi-loan.scheduler';
import { LoanHelperService } from '../src/subscribers/loan-helper.service';

jest.mock('redis-semaphore');

describe(GondiLoanScheduler.name, () => {
  let scheduler: GondiLoanScheduler;
  let loanHelper: LoanHelperService;

  beforeAll(() => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => void 0);
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => void 0);
  });

  beforeEach(async () => {
    jest.resetAllMocks();

    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [
            (): object => ({
              baseDir: '/app/tmp'
            })
          ]
        }),
        ScheduleModule.forRoot(),
        HealthModule
      ],
      providers: [
        GondiLoanScheduler,
        { provide: LoanHelperService, useValue: { markOverdueLoansAsDefaulted: jest.fn() } },
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

    scheduler = moduleRef.get(GondiLoanScheduler);
    loanHelper = moduleRef.get(LoanHelperService);

    jest.spyOn(RedisSemaphore.Mutex.prototype, 'tryAcquire').mockResolvedValue(true);
    jest.spyOn(RedisSemaphore.Mutex.prototype, 'release').mockResolvedValue();
  });

  describe(GondiLoanScheduler.prototype.onLoanDefaulted.name, () => {
    it('should call transformAndSave', async () => {
      // TODO(unclear): test case name is legacy; scheduler now delegates to LoanHelperService.markOverdueLoansAsDefaulted.
      const fnRun = jest.spyOn(loanHelper, 'markOverdueLoansAsDefaulted').mockResolvedValueOnce();

      await scheduler.onLoanDefaulted();

      expect(fnRun).toHaveBeenCalledTimes(1);
      expect(fnRun).toHaveBeenCalledWith(MarketLoanProtocol.Gondi);
    });
  });
});
