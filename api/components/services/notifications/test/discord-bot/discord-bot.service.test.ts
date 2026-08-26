import { BadRequestException, INestApplication, Logger } from '@nestjs/common';
import Discord from 'discord.js';
import { INJECT_DISCORD_CLIENT } from '@discord-nestjs/core';
import { Test } from '@nestjs/testing';
import {
  DiscordMessageDto,
  DiscordMessageNewListingContextDto,
  DiscordMessageType
} from '@nftfi.api/facades/discord-notifications';
import { NotificationChannel, NotificationRepository } from '@nftfi.api/repositories/postgres/notification';
import {
  NotificationSubscription,
  NotificationSubscriptionRepository
} from '@nftfi.api/repositories/postgres/notification-subscription';
import { DiscordBotService } from '../../src/discord-bot/discord-bot.service';
import { DiscordEmbedBuilderService } from '../../src/discord-bot/discord-embed-builder.service';
import { DEFAULT_PREFIX, DiscordComms, SubscriptionType } from '../../src/discord-bot/discord-bot.types';

const buildSubscription = (overrides: Partial<NotificationSubscription> = {}): NotificationSubscription =>
  ({
    id: 1,
    channelId: '1',
    prefix: '!',
    inputs: ['*'],
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-01T00:00:00.000Z'),
    ...overrides
  } as NotificationSubscription);

const buildDiscordComms = (overrides: Partial<DiscordComms> = {}): DiscordComms =>
  ({
    id: 1,
    key: '123',
    channel: NotificationChannel.Discord,
    sent: false,
    template: DiscordMessageType.NewListing,
    recipient: '1',
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-01T00:00:00.000Z'),
    context: {
      assetUrl: 'https://nftfi.com/loan/1',
      nftCollateralContract: '0xdd2b96f0e708f2de5af69cbad82824330ac182ee',
      nftCollateralId: '1',
      imageUrl: 'https://nftfi.com/image.jpg',
      assetCategory: 'Art',
      assetName: 'Artwork'
    },
    ...overrides
  } as DiscordComms);

const buildNewListingContext = (
  overrides: Partial<DiscordMessageNewListingContextDto> = {}
): DiscordMessageNewListingContextDto => ({
  assetUrl: 'https://nftfi.com/loan/1',
  nftCollateralContract: '0xdd2b96f0e708f2de5af69cbad82824330ac182ee',
  nftCollateralId: '1',
  imageUrl: 'https://nftfi.com/image.jpg',
  assetCategory: 'Art',
  assetName: 'Artwork',
  ...overrides
});

const buildNewListingDto = (overrides: Partial<DiscordMessageDto> = {}): DiscordMessageDto => ({
  commsId: '123',
  type: DiscordMessageType.NewListing,
  context: buildNewListingContext(),
  ...overrides
});

describe(DiscordBotService.name, () => {
  let app: INestApplication;
  let service: DiscordBotService;
  let subscriptionRepository: NotificationSubscriptionRepository;
  let notificationRepository: NotificationRepository;
  let discordClient: Discord.Client;
  let discordChannel: Discord.TextChannel;
  let fetchChannel: jest.Mock;

  const mockSubscriptions = (subscriptions: NotificationSubscription[]): void => {
    jest.spyOn(subscriptionRepository, 'iterate').mockReturnValue(
      (async function* (): AsyncGenerator<NotificationSubscription> {
        for (const subscription of subscriptions) {
          yield subscription;
        }
      })()
    );
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    discordChannel = { send: jest.fn().mockResolvedValue(undefined) } as unknown as Discord.TextChannel;
    fetchChannel = jest.fn().mockResolvedValue(discordChannel);

    const moduleRef = await Test.createTestingModule({
      providers: [
        DiscordBotService,
        DiscordEmbedBuilderService,
        {
          provide: INJECT_DISCORD_CLIENT,
          useValue: { channels: { fetch: fetchChannel } }
        },
        {
          provide: NotificationRepository,
          useValue: {
            exists: jest.fn().mockResolvedValue(false),
            upsert: jest.fn(),
            iterateOverPendingPerChannel: jest.fn(),
            markAsSent: jest.fn(),
            deleteNotSentByRecipient: jest.fn()
          }
        },
        {
          provide: NotificationSubscriptionRepository,
          useValue: {
            iterate: jest.fn(),
            findByChannelId: jest.fn(),
            delete: jest.fn()
          }
        }
      ]
    }).compile();

    app = moduleRef.createNestApplication();
    service = moduleRef.get(DiscordBotService);
    subscriptionRepository = moduleRef.get(NotificationSubscriptionRepository);
    notificationRepository = moduleRef.get(NotificationRepository);
    discordClient = moduleRef.get(INJECT_DISCORD_CLIENT);

    mockSubscriptions([buildSubscription({ inputs: ['*'] })]);

    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    jest.spyOn(Logger.prototype, 'log').mockImplementation();

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe(DiscordBotService.prototype.create.name, () => {
    it('throws when embed builder is missing', async () => {
      await expect(
        service.create(buildNewListingDto({ type: 'test' as unknown as DiscordMessageType }))
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('skips create when message already exists and resend is false', async () => {
      jest.spyOn(notificationRepository, 'exists').mockResolvedValue(true);

      await service.create(buildNewListingDto());

      expect(notificationRepository.upsert).not.toHaveBeenCalled();
    });

    it('creates when message already exists but resend is true', async () => {
      jest.spyOn(notificationRepository, 'exists').mockResolvedValue(true);

      await service.create(
        buildNewListingDto({
          options: { resend: true }
        })
      );

      expect(notificationRepository.upsert).toHaveBeenCalledTimes(1);
    });

    it('creates pending discord comm when channel exists', async () => {
      await service.create(buildNewListingDto());

      expect(notificationRepository.upsert).toHaveBeenCalledWith({
        channel: NotificationChannel.Discord,
        key: '123',
        template: DiscordMessageType.NewListing,
        recipient: '1',
        sent: false,
        context: {
          nftCollateralContract: '0xdd2b96f0e708f2de5af69cbad82824330ac182ee',
          nftCollateralId: '1',
          assetUrl: 'https://nftfi.com/loan/1',
          imageUrl: 'https://nftfi.com/image.jpg',
          assetCategory: 'Art',
          assetName: 'Artwork'
        }
      });
    });

    it('skips create when discord channel is not found', async () => {
      jest.spyOn(discordClient.channels, 'fetch').mockResolvedValueOnce(null);

      await service.create(buildNewListingDto());

      expect(notificationRepository.upsert).not.toHaveBeenCalled();
    });

    it('cleans stale subscription when channel cannot be accessed', async () => {
      const inaccessibleError = Object.assign(Object.create(Discord.DiscordAPIError.prototype), {
        code: 10003,
        message: 'Unknown Channel'
      });
      jest.spyOn(discordClient.channels, 'fetch').mockRejectedValueOnce(inaccessibleError);
      const cleanupSpy = jest.spyOn(service, 'deleteSubscriptionByChannelId').mockResolvedValue(undefined);

      await service.create(buildNewListingDto());

      expect(notificationRepository.upsert).not.toHaveBeenCalled();
      expect(cleanupSpy).toHaveBeenCalledWith('1');
    });

    it('matches single-contract subscriptions', async () => {
      mockSubscriptions([buildSubscription({ inputs: ['0xdd2b96f0e708f2de5af69cbad82824330ac182ee'] })]);

      await service.create(buildNewListingDto());

      expect(notificationRepository.upsert).toHaveBeenCalledTimes(1);
    });

    it('matches single-item subscriptions', async () => {
      mockSubscriptions([buildSubscription({ inputs: ['0xabc:10'] })]);

      await service.create(
        buildNewListingDto({
          context: buildNewListingContext({
            nftCollateralContract: '0xabc',
            nftCollateralId: '10'
          })
        })
      );

      expect(notificationRepository.upsert).toHaveBeenCalledTimes(1);
    });

    it('does not match single-item subscriptions when nft id differs', async () => {
      mockSubscriptions([buildSubscription({ inputs: ['0xabc:10'] })]);

      await service.create(
        buildNewListingDto({
          context: buildNewListingContext({
            nftCollateralContract: '0xabc',
            nftCollateralId: '11'
          })
        })
      );

      expect(notificationRepository.upsert).not.toHaveBeenCalled();
    });

    it('matches ranged subscriptions', async () => {
      mockSubscriptions([buildSubscription({ inputs: ['0xabc:10..20'] })]);

      await service.create(
        buildNewListingDto({
          context: buildNewListingContext({
            nftCollateralContract: '0xabc',
            nftCollateralId: '15'
          })
        })
      );

      expect(notificationRepository.upsert).toHaveBeenCalledTimes(1);
    });

    it('does not match ranged subscriptions when nft id is out of range', async () => {
      mockSubscriptions([buildSubscription({ inputs: ['0xabc:10..20'] })]);

      await service.create(
        buildNewListingDto({
          context: buildNewListingContext({
            nftCollateralContract: '0xabc',
            nftCollateralId: '21'
          })
        })
      );

      expect(notificationRepository.upsert).not.toHaveBeenCalled();
    });

    it('matches top-bound subscriptions', async () => {
      mockSubscriptions([buildSubscription({ inputs: ['0xabc:..20'] })]);

      await service.create(
        buildNewListingDto({
          context: buildNewListingContext({
            nftCollateralContract: '0xabc',
            nftCollateralId: '15'
          })
        })
      );

      expect(notificationRepository.upsert).toHaveBeenCalledTimes(1);
    });

    it('does not match top-bound subscriptions when nft id exceeds top', async () => {
      mockSubscriptions([buildSubscription({ inputs: ['0xabc:..20'] })]);

      await service.create(
        buildNewListingDto({
          context: buildNewListingContext({
            nftCollateralContract: '0xabc',
            nftCollateralId: '21'
          })
        })
      );

      expect(notificationRepository.upsert).not.toHaveBeenCalled();
    });

    it('matches bottom-bound subscriptions', async () => {
      mockSubscriptions([buildSubscription({ inputs: ['0xabc:10..'] })]);

      await service.create(
        buildNewListingDto({
          context: buildNewListingContext({
            nftCollateralContract: '0xabc',
            nftCollateralId: '15'
          })
        })
      );

      expect(notificationRepository.upsert).toHaveBeenCalledTimes(1);
    });

    it('does not match bottom-bound subscriptions when nft id is below bottom', async () => {
      mockSubscriptions([buildSubscription({ inputs: ['0xabc:10..'] })]);

      await service.create(
        buildNewListingDto({
          context: buildNewListingContext({
            nftCollateralContract: '0xabc',
            nftCollateralId: '9'
          })
        })
      );

      expect(notificationRepository.upsert).not.toHaveBeenCalled();
    });
  });

  describe(DiscordBotService.prototype.sendPendingNotifications.name, () => {
    it('iterates pending discord notifications and suppresses send errors', async () => {
      const first = buildDiscordComms({ id: 1 });
      const second = buildDiscordComms({ id: 2 });
      jest.spyOn(notificationRepository, 'iterateOverPendingPerChannel').mockReturnValue(
        (async function* (): AsyncGenerator<DiscordComms> {
          yield first;
          yield second;
        })() as unknown as ReturnType<NotificationRepository['iterateOverPendingPerChannel']>
      );
      jest.spyOn(service, 'send').mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('send error'));

      await expect(service.sendPendingNotifications()).resolves.toBeUndefined();

      expect(notificationRepository.iterateOverPendingPerChannel).toHaveBeenCalledWith(NotificationChannel.Discord);
      expect(service.send).toHaveBeenCalledTimes(2);
    });
  });

  describe(DiscordBotService.prototype.send.name, () => {
    it('returns when embed builder is missing', async () => {
      const comm = buildDiscordComms({ template: 'unknown' });

      await service.send(comm);

      expect(notificationRepository.markAsSent).not.toHaveBeenCalled();
    });

    it('returns when discord channel is missing', async () => {
      jest.spyOn(discordClient.channels, 'fetch').mockResolvedValueOnce(undefined);
      const cleanupSpy = jest.spyOn(service, 'deleteSubscriptionByChannelId').mockResolvedValue(undefined);
      const comm = buildDiscordComms();

      await service.send(comm);

      expect(notificationRepository.markAsSent).not.toHaveBeenCalled();
      expect(cleanupSpy).toHaveBeenCalledWith(comm.recipient);
    });

    it('sends message and marks notification as sent', async () => {
      const comm = buildDiscordComms();

      await service.send(comm);

      expect(discordChannel.send).toHaveBeenCalledTimes(1);
      expect(notificationRepository.markAsSent).toHaveBeenCalledWith(comm);
    });

    it('does not mark as sent when discord send throws', async () => {
      const comm = buildDiscordComms();
      jest.spyOn(discordChannel, 'send').mockRejectedValueOnce(new Error('discord send failed'));

      await service.send(comm);

      expect(notificationRepository.markAsSent).not.toHaveBeenCalled();
    });

    it('returns when fetching channel fails with unexpected error', async () => {
      jest.spyOn(discordClient.channels, 'fetch').mockRejectedValueOnce(new Error('network issue'));
      const comm = buildDiscordComms();

      await service.send(comm);

      expect(notificationRepository.markAsSent).not.toHaveBeenCalled();
    });
  });

  describe(DiscordBotService.prototype.getPrefixByChannelId.name, () => {
    it('returns channel prefix when subscription exists', async () => {
      jest.spyOn(subscriptionRepository, 'findByChannelId').mockResolvedValueOnce(buildSubscription({ prefix: '#' }));

      await expect(service.getPrefixByChannelId('1')).resolves.toBe('#');
    });

    it('returns default prefix when subscription does not exist', async () => {
      jest.spyOn(subscriptionRepository, 'findByChannelId').mockResolvedValueOnce(null);

      await expect(service.getPrefixByChannelId('1')).resolves.toBe(DEFAULT_PREFIX);
    });
  });

  describe(DiscordBotService.prototype.deleteSubscriptionByChannelId.name, () => {
    it('deletes pending notifications and subscription when channel exists', async () => {
      const subscription = buildSubscription({ channelId: '1' });
      jest.spyOn(subscriptionRepository, 'findByChannelId').mockResolvedValueOnce(subscription);

      await expect(service.deleteSubscriptionByChannelId('1')).resolves.toBeUndefined();
      expect(notificationRepository.deleteNotSentByRecipient).toHaveBeenCalledWith('1');
      expect(subscriptionRepository.delete).toHaveBeenCalledWith(subscription);
    });

    it('deletes pending notifications even when channel subscription does not exist', async () => {
      jest.spyOn(subscriptionRepository, 'findByChannelId').mockResolvedValueOnce(null);

      await expect(service.deleteSubscriptionByChannelId('1')).resolves.toBeUndefined();
      expect(notificationRepository.deleteNotSentByRecipient).toHaveBeenCalledWith('1');
      expect(subscriptionRepository.delete).not.toHaveBeenCalled();
    });
  });

  describe(DiscordBotService.prototype.parseUserInput.name, () => {
    it('parses all-contract wildcard', () => {
      expect(service.parseUserInput('*')).toEqual({ type: SubscriptionType.AllContracts, contract: '*' });
    });

    it('parses single contract', () => {
      expect(service.parseUserInput('0xABC')).toEqual({
        type: SubscriptionType.SingleContract,
        contract: '0xabc'
      });
    });

    it('parses single contract and single item', () => {
      expect(service.parseUserInput('0xabc:42')).toEqual({
        type: SubscriptionType.SingleContractSingleItem,
        contract: '0xabc',
        item: '42'
      });
    });

    it('parses ranged contract item', () => {
      expect(service.parseUserInput('0xabc:10..20')).toEqual({
        type: SubscriptionType.SingleContractRanged,
        contract: '0xabc',
        bottom: 10,
        top: 20
      });
    });

    it('parses top-bound ranged contract item', () => {
      expect(service.parseUserInput('0xabc:..20')).toEqual({
        type: SubscriptionType.SingleContractRangeTopBound,
        contract: '0xabc',
        bottom: NaN,
        top: 20
      });
    });

    it('parses bottom-bound ranged contract item', () => {
      expect(service.parseUserInput('0xabc:10..')).toEqual({
        type: SubscriptionType.SingleContractRangeBottomBound,
        contract: '0xabc',
        bottom: 10,
        top: NaN
      });
    });

    it('returns null for invalid input', () => {
      expect(service.parseUserInput('invalid:::')).toBeNull();
    });
  });
});
