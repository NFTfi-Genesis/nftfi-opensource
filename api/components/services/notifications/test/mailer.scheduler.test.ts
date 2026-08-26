import { Test } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import * as RedisSemaphore from 'redis-semaphore';
import { HealthModule } from '@nftfi.api/modules/health';
import { MailerScheduler } from '../src/mailer/mailer.scheduler';
import { MailerService } from '../src/mailer/mailer.service';

jest.mock('redis-semaphore');

describe(MailerScheduler.name, () => {
  let scheduler: MailerScheduler;
  let service: MailerService;

  beforeEach(async () => {
    jest.resetAllMocks();

    const moduleRef = await Test.createTestingModule({
      imports: [HealthModule],
      providers: [
        MailerScheduler,
        {
          provide: MailerService,
          useValue: {
            sendPendingNotifications: jest.fn()
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

    scheduler = moduleRef.get(MailerScheduler);
    service = moduleRef.get(MailerService);

    jest.spyOn(RedisSemaphore.Mutex.prototype, 'tryAcquire').mockResolvedValue(true);
    jest.spyOn(RedisSemaphore.Mutex.prototype, 'release').mockResolvedValue();
  });

  describe(MailerScheduler.prototype.handleSendPendingNotifications.name, () => {
    it('sends pending notifications', async () => {
      const fnSendPending = jest.spyOn(service, 'sendPendingNotifications').mockResolvedValue();

      await scheduler.handleSendPendingNotifications();

      expect(fnSendPending).toHaveBeenCalledTimes(1);
    });
  });
});
