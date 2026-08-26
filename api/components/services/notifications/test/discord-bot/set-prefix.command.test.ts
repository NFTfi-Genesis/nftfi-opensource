import { INestApplication, Logger } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { SlashCommandPipe } from '@discord-nestjs/common';
import { ReflectMetadataProvider } from '@discord-nestjs/core';
import {
  NotificationSubscription,
  NotificationSubscriptionRepository
} from '@nftfi.api/repositories/postgres/notification-subscription';
import { HelpCommand, SetPrefixCommand } from '../../src/discord-bot/commands';

const buildSubscription = (overrides: Partial<NotificationSubscription> = {}): NotificationSubscription =>
  ({
    id: 1,
    channelId: '123',
    prefix: '!',
    inputs: ['*'],
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-01T00:00:00.000Z'),
    ...overrides
  } as NotificationSubscription);

describe(SetPrefixCommand, () => {
  let app: INestApplication;
  let command: SetPrefixCommand;
  let subscriptionRepository: NotificationSubscriptionRepository;

  beforeEach(async () => {
    jest.resetAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [
        SetPrefixCommand,
        HelpCommand,
        { provide: ReflectMetadataProvider, useValue: {} },
        { provide: SlashCommandPipe, useValue: {} },
        {
          provide: NotificationSubscriptionRepository,
          useValue: { findByChannelId: jest.fn(), update: jest.fn() }
        }
      ]
    }).compile();

    app = moduleRef.createNestApplication();
    command = moduleRef.get(SetPrefixCommand);
    subscriptionRepository = moduleRef.get(NotificationSubscriptionRepository);

    jest.spyOn(Logger.prototype, 'error').mockImplementation();

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe(SetPrefixCommand.prototype.handle.name, () => {
    it('returns info message if no prefix was passed', async () => {
      const result = await command.handle({ channelId: '123' }, { prefix: '' });

      expect(result).toBe('Oops! You need to say what the new prefix should be.');
    });

    it('returns info message if no dto was passed', async () => {
      const result = await command.handle({ channelId: '123' }, null);

      expect(result).toBe('Oops! You need to say what the new prefix should be.');
    });

    it('returns early when prefix is already set', async () => {
      jest.spyOn(subscriptionRepository, 'findByChannelId').mockResolvedValue(buildSubscription({ prefix: '^' }));

      const result = await command.handle({ channelId: '123' }, { prefix: '^' });

      expect(result).toBe("The prefix is already set to '^'!");
      expect(subscriptionRepository.update).not.toHaveBeenCalled();
    });

    it('returns an error message if something goes wrong', async () => {
      jest.spyOn(subscriptionRepository, 'findByChannelId').mockRejectedValue(new Error('error'));

      const result = await command.handle({ channelId: '123' }, { prefix: '!' });

      expect(result).toBe('Something went wrong ;(');
    });

    it('returns success message if the prefix was updated', async () => {
      const existing = buildSubscription({ channelId: '123', prefix: '!' });
      jest.spyOn(subscriptionRepository, 'findByChannelId').mockResolvedValue(existing);

      const result = await command.handle({ channelId: '123' }, { prefix: '^' });

      expect(result).toBe(
        "Ok, I'll respond to this new prefix '^' from now on. \r\n\r\n" + '(For more info, just say `^help`)'
      );
      expect(subscriptionRepository.update).toHaveBeenCalledWith(existing, { prefix: '^' });
    });
  });
});
