import { Test } from '@nestjs/testing';
import { ExecutionContext, INestApplication } from '@nestjs/common';
import {
  NotificationSubscription,
  NotificationSubscriptionRepository
} from '@nftfi.api/repositories/postgres/notification-subscription';
import { IsUserPrefixGuard } from '../../src/discord-bot/guards/is-user-prefix.guard';

const buildSubscription = (overrides: Partial<NotificationSubscription> = {}): NotificationSubscription =>
  ({
    id: 1,
    channelId: '123',
    prefix: '!',
    inputs: [],
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-01T00:00:00.000Z'),
    ...overrides
  } as NotificationSubscription);

describe(IsUserPrefixGuard.name, () => {
  let app: INestApplication;
  let guard: IsUserPrefixGuard;
  let subscriptionRepository: NotificationSubscriptionRepository;

  beforeEach(async () => {
    jest.resetAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [
        IsUserPrefixGuard,
        { provide: NotificationSubscriptionRepository, useValue: { findByChannelId: jest.fn() } }
      ]
    }).compile();

    app = moduleRef.createNestApplication();
    guard = moduleRef.get(IsUserPrefixGuard);
    subscriptionRepository = moduleRef.get(NotificationSubscriptionRepository);

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns false if message does not start with configured prefix', async () => {
    jest.spyOn(subscriptionRepository, 'findByChannelId').mockResolvedValue(buildSubscription({ prefix: '^' }));

    const context: ExecutionContext = {
      getArgs: () => [{ channel: { id: '123' }, content: '!not-prefixed' }]
    } as ExecutionContext;

    const result = await guard.canActivate(context);
    expect(result).toBe(false);
  });

  it('returns true if message starts with configured prefix', async () => {
    jest.spyOn(subscriptionRepository, 'findByChannelId').mockResolvedValue(buildSubscription({ prefix: '!' }));

    const context: ExecutionContext = {
      getArgs: () => [{ channel: { id: '123' }, content: '!prefix' }]
    } as ExecutionContext;

    const result = await guard.canActivate(context);
    expect(result).toBe(true);
  });

  it('returns true if message starts with default prefix when no subscription exists', async () => {
    jest.spyOn(subscriptionRepository, 'findByChannelId').mockResolvedValue(null);

    const context: ExecutionContext = {
      getArgs: () => [{ channel: { id: '123' }, content: '!' }]
    } as ExecutionContext;

    const result = await guard.canActivate(context);
    expect(result).toBe(true);
  });
});
