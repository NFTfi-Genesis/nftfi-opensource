import { Test } from '@nestjs/testing';
import { INestApplication, Logger } from '@nestjs/common';
import Discord from 'discord.js';
import { INJECT_DISCORD_CLIENT, ReflectMetadataProvider } from '@discord-nestjs/core';
import { TRANSFORMER_OPTION } from '@discord-nestjs/common';
import { NotificationSubscriptionRepository } from '@nftfi.api/repositories/postgres/notification-subscription';
import { DiscordBotGateway, DiscordBotService } from '../../src/discord-bot';
import {
  HelpCommand,
  SetPrefixCommand,
  SubscribeCommand,
  UnsubscribeCommand,
  ViewCommand
} from '../../src/discord-bot/commands';
import { SubscribeDto } from '../../src/discord-bot/dtos';

describe(DiscordBotGateway, () => {
  let app: INestApplication;
  let gateway: DiscordBotGateway;
  let discordBotService: DiscordBotService;
  let helpCommand: HelpCommand;
  let viewCommand: ViewCommand;
  let setPrefixCommand: SetPrefixCommand;
  let subscribeCommand: SubscribeCommand;
  let unsubscribeCommand: UnsubscribeCommand;

  beforeEach(async () => {
    jest.resetAllMocks();

    const discordChannel = { send: jest.fn() } as unknown as Discord.TextChannel;

    const moduleRef = await Test.createTestingModule({
      providers: [
        DiscordBotGateway,
        {
          provide: INJECT_DISCORD_CLIENT,
          useValue: { channels: { cache: { get: jest.fn().mockReturnValue(discordChannel) } } }
        },
        {
          provide: TRANSFORMER_OPTION,
          useValue: { enableImplicitConversion: true }
        },
        { provide: ReflectMetadataProvider, useValue: { get: jest.fn() } },
        { provide: NotificationSubscriptionRepository, useValue: { findByChannelId: jest.fn() } },
        { provide: DiscordBotService, useValue: { deleteSubscriptionByChannelId: jest.fn() } },
        { provide: HelpCommand, useValue: { handle: jest.fn() } },
        { provide: ViewCommand, useValue: { handle: jest.fn() } },
        { provide: SetPrefixCommand, useValue: { handle: jest.fn() } },
        { provide: SubscribeCommand, useValue: { handle: jest.fn() } },
        { provide: UnsubscribeCommand, useValue: { handle: jest.fn() } }
      ]
    }).compile();

    app = moduleRef.createNestApplication();
    gateway = moduleRef.get(DiscordBotGateway);
    discordBotService = moduleRef.get(DiscordBotService);
    helpCommand = moduleRef.get(HelpCommand);
    viewCommand = moduleRef.get(ViewCommand);
    setPrefixCommand = moduleRef.get(SetPrefixCommand);
    subscribeCommand = moduleRef.get(SubscribeCommand);
    unsubscribeCommand = moduleRef.get(UnsubscribeCommand);

    jest.spyOn(Logger.prototype, 'error').mockImplementation();

    await app.init();
  });

  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-01'));
  });

  afterAll(async () => {
    await app.close();
  });

  describe(DiscordBotGateway.prototype.onHelpMessage, () => {
    it('calls helpCommand.handle', async () => {
      const message = { content: 'help' } as Discord.Message;
      jest.spyOn(helpCommand, 'handle').mockResolvedValue('help response');

      await gateway.onHelpMessage(message);

      expect(helpCommand.handle).toHaveBeenCalledWith(message);
    });
  });

  describe(DiscordBotGateway.prototype.onReady, () => {
    it('logs bot startup', () => {
      const logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
      const client = (gateway as unknown as { client: { user: { tag: string } } }).client;
      client.user = { tag: 'test-bot#0001' } as unknown as typeof client.user;

      gateway.onReady();

      expect(logSpy).toHaveBeenCalledWith('Bot test-bot#0001 was started!');
    });
  });

  describe(DiscordBotGateway.prototype.onShardError, () => {
    it('logs shard error', () => {
      const errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
      const error = new Error('boom');

      gateway.onShardError(error, 2);

      expect(errorSpy).toHaveBeenCalledWith('Shard 2 error: boom');
    });
  });

  describe(DiscordBotGateway.prototype.onViewMessage, () => {
    it('calls viewCommand.handle', async () => {
      const message = { content: 'view' } as Discord.Message;
      jest.spyOn(viewCommand, 'handle').mockResolvedValue('view response');

      await gateway.onViewMessage(message);

      expect(viewCommand.handle).toHaveBeenCalledWith(message);
    });
  });

  describe(DiscordBotGateway.prototype.onSetPrefixMessage, () => {
    it('calls setPrefixCommand.handle', async () => {
      const message = { content: 'newprefix' } as Discord.Message;
      const dto = { prefix: '!' };
      jest.spyOn(setPrefixCommand, 'handle').mockResolvedValue('set prefix response');

      await gateway.onSetPrefixMessage(message, dto);

      expect(setPrefixCommand.handle).toHaveBeenCalledWith(message, dto);
    });
  });

  describe(DiscordBotGateway.prototype.onSubscribeMessage, () => {
    it('calls subscribeCommand.handle', async () => {
      const message = {
        channelId: '111',
        channel: {},
        reply: jest.fn() as Discord.Message['reply'],
        content: 'subscribe'
      } as Discord.Message;
      const dto: SubscribeDto = { contracts: ['0x123'] };
      jest.spyOn(subscribeCommand, 'handle').mockResolvedValue('subscribe response');

      await gateway.onSubscribeMessage(message, dto);

      expect(subscribeCommand.handle).toHaveBeenCalledWith(
        {
          channelId: '111',
          channel: {},
          reply: expect.any(Function)
        },
        dto
      );
    });
  });

  describe(DiscordBotGateway.prototype.onUnsubscribeMessage, () => {
    it('calls unsubscribeCommand.handle', async () => {
      const message = { channel: {}, channelId: '111', content: 'unsubscribe' } as Discord.Message;
      const dto: SubscribeDto = { contracts: ['0x123'] };
      jest.spyOn(unsubscribeCommand, 'handle').mockResolvedValue('unsubscribe response');

      await gateway.onUnsubscribeMessage(message, dto);

      expect(unsubscribeCommand.handle).toHaveBeenCalledWith({ channelId: '111', channel: {} }, dto);
    });
  });

  describe(DiscordBotGateway.prototype.onChannelDelete, () => {
    it('calls discordBotService.deleteSubscriptionByChannelId', async () => {
      const channel = { id: '123' } as Discord.Channel;
      const deleteFn = jest.spyOn(discordBotService, 'deleteSubscriptionByChannelId').mockResolvedValue(undefined);

      await gateway.onChannelDelete(channel);

      expect(deleteFn).toHaveBeenCalledWith(channel.id);
    });
  });
});
