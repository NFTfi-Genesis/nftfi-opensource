import { INestApplication, Logger } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { SlashCommandPipe } from '@discord-nestjs/common';
import { ReflectMetadataProvider } from '@discord-nestjs/core';
import {
  NotificationSubscription,
  NotificationSubscriptionRepository
} from '@nftfi.api/repositories/postgres/notification-subscription';
import { UnsubscribeCommand } from '../../src/discord-bot/commands';
import { DiscordBotService } from '../../src/discord-bot/discord-bot.service';
import { SubscriptionType } from '../../src/discord-bot/discord-bot.types';
import { buildCommandEvent } from '../factories/discord-bot.factory';

const buildSubscription = (overrides: Partial<NotificationSubscription> = {}): NotificationSubscription =>
  ({
    id: 1,
    channelId: '123',
    prefix: '!',
    inputs: ['0x0', '0x1'],
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-01T00:00:00.000Z'),
    ...overrides
  } as NotificationSubscription);

describe(UnsubscribeCommand, () => {
  let app: INestApplication;
  let command: UnsubscribeCommand;
  let subscriptionRepository: NotificationSubscriptionRepository;
  let discordService: DiscordBotService;

  beforeEach(async () => {
    jest.resetAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [
        UnsubscribeCommand,
        { provide: ReflectMetadataProvider, useValue: {} },
        { provide: SlashCommandPipe, useValue: {} },
        { provide: DiscordBotService, useValue: { getPrefixByChannelId: jest.fn(), parseUserInput: jest.fn() } },
        {
          provide: NotificationSubscriptionRepository,
          useValue: { findByChannelId: jest.fn(), update: jest.fn() }
        }
      ]
    }).compile();

    app = moduleRef.createNestApplication();
    command = moduleRef.get(UnsubscribeCommand);
    subscriptionRepository = moduleRef.get(NotificationSubscriptionRepository);
    discordService = moduleRef.get(DiscordBotService);

    jest.spyOn(Logger.prototype, 'error').mockImplementation();

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe(UnsubscribeCommand.prototype.handle.name, () => {
    it('returns message when no contracts found in payload', async () => {
      const event = buildCommandEvent();

      const result = await command.handle(event, { contracts: null });
      expect(result).toBe('Oops! You need to say what contract(s) you want to unsubscribe from.');
    });

    it('returns message when no payload provided', async () => {
      const event = buildCommandEvent();

      const result = await command.handle(event, null);
      expect(result).toBe('Oops! You need to say what contract(s) you want to unsubscribe from.');
    });

    it('returns message when no active subscription exists for channel', async () => {
      const event = buildCommandEvent();
      jest.spyOn(subscriptionRepository, 'findByChannelId').mockResolvedValue(null);

      const result = await command.handle(event, { contracts: ['0x0'] });
      expect(result).toBe("It seems like you don't have any active subscriptions.");
    });

    it('skips invalid contract types', async () => {
      const event = buildCommandEvent();
      const existing = buildSubscription();
      jest.spyOn(subscriptionRepository, 'findByChannelId').mockResolvedValue(existing);
      jest.spyOn(discordService, 'getPrefixByChannelId').mockResolvedValue('!');

      const result = await command.handle(event, { contracts: [''] });
      expect(result).toBe('No valid contracts were found in your input');
    });

    it('unsubscribes from specified contracts', async () => {
      const event = buildCommandEvent();
      const existing = buildSubscription();
      jest.spyOn(subscriptionRepository, 'findByChannelId').mockResolvedValue(existing);
      jest.spyOn(discordService, 'getPrefixByChannelId').mockResolvedValue('!');
      jest
        .spyOn(discordService, 'parseUserInput')
        .mockReturnValueOnce({ type: SubscriptionType.SingleContract, contract: '0x0' })
        .mockReturnValueOnce({ type: SubscriptionType.SingleContract, contract: '0x1' });

      const result = await command.handle(event, { contracts: ['0x0', '0x1'] });
      expect(result).toBe("You're now unsubscribed from `0x0, 0x1`");
      expect(event.channel.send).not.toHaveBeenCalled();
      expect(subscriptionRepository.update).toHaveBeenNthCalledWith(1, existing, { inputs: ['0x1'] });
      expect(subscriptionRepository.update).toHaveBeenNthCalledWith(2, existing, { inputs: ['0x0'] });
    });

    it('unsubscribes from all contracts', async () => {
      const event = buildCommandEvent();
      const existing = buildSubscription();
      jest.spyOn(subscriptionRepository, 'findByChannelId').mockResolvedValue(existing);
      jest.spyOn(discordService, 'getPrefixByChannelId').mockResolvedValue('!');
      jest
        .spyOn(discordService, 'parseUserInput')
        .mockReturnValueOnce({ type: SubscriptionType.SingleContract, contract: '0x0' })
        .mockReturnValueOnce({ type: SubscriptionType.AllContracts, contract: '*' });

      const result = await command.handle(event, { contracts: ['0x0', '*'] });
      expect(result).toBe("You're now unsubscribed from all contracts");
      expect(event.channel.send).not.toHaveBeenCalled();
      expect(subscriptionRepository.update).toHaveBeenCalledWith(existing, { inputs: [] });
    });

    it('skips invalid contracts and notifies user', async () => {
      const event = buildCommandEvent();
      const existing = buildSubscription();
      jest.spyOn(subscriptionRepository, 'findByChannelId').mockResolvedValue(existing);
      jest.spyOn(discordService, 'getPrefixByChannelId').mockResolvedValue('!');
      jest
        .spyOn(discordService, 'parseUserInput')
        .mockReturnValueOnce(null)
        .mockReturnValueOnce({ type: SubscriptionType.AllContracts, contract: '*' });

      const result = await command.handle(event, { contracts: ['0x0', '*'] });
      expect(result).toBe("You're now unsubscribed from all contracts");
      expect(event.channel.send).toHaveBeenCalledTimes(1);
      expect(event.channel.send).toHaveBeenCalledWith(
        'Sorry, the subscription `0x0` is invalid. Type `!help` for correct syntax.'
      );
    });

    it('shows error message when something goes wrong', async () => {
      const event = buildCommandEvent();
      const existing = buildSubscription();
      jest.spyOn(subscriptionRepository, 'findByChannelId').mockResolvedValue(existing);
      jest.spyOn(discordService, 'getPrefixByChannelId').mockResolvedValue('!');
      jest.spyOn(discordService, 'parseUserInput').mockImplementation(() => {
        throw new Error('Oops!');
      });

      const result = await command.handle(event, { contracts: ['0x0'] });
      expect(result).toBe('Something went wrong ;(');
    });
  });
});
