import { Test } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import * as RedisSemaphore from 'redis-semaphore';
import { HealthModule } from '@nftfi.api/modules/health';
import { DiscordBotScheduler } from '../../src/discord-bot/discord-bot.scheduler';
import { DiscordBotService } from '../../src/discord-bot/discord-bot.service';

jest.mock('redis-semaphore');

describe(DiscordBotScheduler.name, () => {
  let scheduler: DiscordBotScheduler;
  let discordBotService: DiscordBotService;

  beforeEach(async () => {
    jest.resetAllMocks();

    const moduleRef = await Test.createTestingModule({
      imports: [HealthModule],
      providers: [
        DiscordBotScheduler,
        {
          provide: DiscordBotService,
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

    scheduler = moduleRef.get(DiscordBotScheduler);
    discordBotService = moduleRef.get(DiscordBotService);

    jest.spyOn(RedisSemaphore.Mutex.prototype, 'tryAcquire').mockResolvedValue(true);
    jest.spyOn(RedisSemaphore.Mutex.prototype, 'release').mockResolvedValue();
  });

  describe(DiscordBotScheduler.prototype.handleSendPendingNotifications.name, () => {
    it('delegates to discord bot service', async () => {
      await scheduler.handleSendPendingNotifications();

      expect(discordBotService.sendPendingNotifications).toHaveBeenCalledTimes(1);
    });
  });
});
