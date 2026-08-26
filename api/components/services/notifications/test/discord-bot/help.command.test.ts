import { INestApplication, Logger } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { SlashCommandPipe } from '@discord-nestjs/common';
import { ReflectMetadataProvider } from '@discord-nestjs/core';
import {
  NotificationSubscription,
  NotificationSubscriptionRepository
} from '@nftfi.api/repositories/postgres/notification-subscription';
import { HelpCommand } from '../../src/discord-bot/commands';

const buildSubscription = (overrides: Partial<NotificationSubscription> = {}): NotificationSubscription =>
  ({
    id: 1,
    channelId: '123',
    prefix: '!',
    inputs: ['contract1', 'contract2'],
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-01T00:00:00.000Z'),
    ...overrides
  } as NotificationSubscription);

describe(HelpCommand, () => {
  let app: INestApplication;
  let command: HelpCommand;
  let subscriptionRepository: NotificationSubscriptionRepository;

  beforeEach(async () => {
    jest.resetAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [
        HelpCommand,
        { provide: ReflectMetadataProvider, useValue: {} },
        { provide: SlashCommandPipe, useValue: {} },
        { provide: NotificationSubscriptionRepository, useValue: { findByChannelId: jest.fn() } }
      ]
    }).compile();

    app = moduleRef.createNestApplication();
    command = moduleRef.get(HelpCommand);
    subscriptionRepository = moduleRef.get(NotificationSubscriptionRepository);

    jest.spyOn(Logger.prototype, 'error').mockImplementation();

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe(HelpCommand.prototype.buildMessage.name, () => {
    it('returns help message', () => {
      const result = command.buildMessage(false, '!');
      expect(result).toContain('**How It Works:**');
      expect(result).toContain('`!view` - check your subscriptions and prefix');
      expect(result).toContain('For more help, speak to a human on our discord server');
    });

    it('returns compact help message', () => {
      const result = command.buildMessage(true, '!');
      expect(result).toBe('\r\n(For more info, just say `!help`)');
    });
  });

  describe(HelpCommand.prototype.handle.name, () => {
    it('returns message when no subscription exists', async () => {
      jest.spyOn(subscriptionRepository, 'findByChannelId').mockResolvedValue(null);

      const result = await command.handle({ channelId: '123' });

      expect(result).toContain("You're not subscribed to any contract events yet.");
      expect(result).toContain('`!view`');
    });

    it('returns message with active subscriptions', async () => {
      jest.spyOn(subscriptionRepository, 'findByChannelId').mockResolvedValue(buildSubscription());

      const result = await command.handle({ channelId: '123' });

      expect(result).toContain("You're subscribed to `contract1, contract2`, your prefix is `!`.");
    });

    it('returns message with no contracts when inputs are empty', async () => {
      jest.spyOn(subscriptionRepository, 'findByChannelId').mockResolvedValue(buildSubscription({ inputs: [] }));

      const result = await command.handle({ channelId: '123' });

      expect(result).toContain("You're not subscribed to any contract events, your prefix is `!`.");
    });

    it('returns message with no contracts when inputs are missing', async () => {
      jest
        .spyOn(subscriptionRepository, 'findByChannelId')
        .mockResolvedValue(buildSubscription({ inputs: undefined as unknown as string[] }));

      const result = await command.handle({ channelId: '123' });

      expect(result).toContain("You're not subscribed to any contract events, your prefix is `!`.");
    });

    it('returns error message when repository throws', async () => {
      jest.spyOn(subscriptionRepository, 'findByChannelId').mockRejectedValue(new Error('error'));

      const result = await command.handle({ channelId: '123' });
      expect(result).toBe('Something went wrong ;(');
    });
  });
});
