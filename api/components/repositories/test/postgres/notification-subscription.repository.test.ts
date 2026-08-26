import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  NotificationSubscription,
  NotificationSubscriptionRepository
} from '@nftfi.api/repositories/postgres/notification-subscription';
import { createTypeormRepositoryMock, MockTypeormRepository } from '../factories';

const buildSubscription = (overrides: Partial<NotificationSubscription> = {}): NotificationSubscription =>
  ({
    id: 1,
    channelId: '123',
    prefix: '!',
    inputs: ['0xabc'],
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-01T00:00:00.000Z'),
    ...overrides
  } as NotificationSubscription);

describe(NotificationSubscriptionRepository.name, () => {
  let repository: NotificationSubscriptionRepository;
  let model: MockTypeormRepository<NotificationSubscription> & { delete: jest.Mock };

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        NotificationSubscriptionRepository,
        {
          provide: getRepositoryToken(NotificationSubscription),
          useValue: createTypeormRepositoryMock<NotificationSubscription>({
            delete: jest.fn()
          })
        }
      ]
    }).compile();

    repository = moduleRef.get(NotificationSubscriptionRepository);
    model = moduleRef.get(getRepositoryToken(NotificationSubscription));
  });

  describe(NotificationSubscriptionRepository.prototype.findByChannelId.name, () => {
    it('finds subscription by channel id', async () => {
      const subscription = buildSubscription();
      model.findOne.mockResolvedValue(subscription);

      const result = await repository.findByChannelId('123');

      expect(model.findOne).toHaveBeenCalledWith({ where: { channelId: '123' } });
      expect(result).toBe(subscription);
    });
  });

  describe(NotificationSubscriptionRepository.prototype.upsert.name, () => {
    it('creates and upserts subscription by channel id', async () => {
      const draft = { channelId: '123', prefix: '!', inputs: ['0xabc'] };
      const created = buildSubscription();
      model.create.mockReturnValue(created);

      await repository.upsert(draft);

      expect(model.create).toHaveBeenCalledWith(draft);
      expect(model.upsert).toHaveBeenCalledWith(created, ['channelId']);
    });
  });

  describe(NotificationSubscriptionRepository.prototype.update.name, () => {
    it('updates subscription by entity id', async () => {
      const subscription = buildSubscription({ id: 8 });

      await repository.update(subscription, { prefix: '#' });

      expect(model.update).toHaveBeenCalledWith({ id: 8 }, { prefix: '#' });
    });
  });

  describe(NotificationSubscriptionRepository.prototype.delete.name, () => {
    it('deletes subscription by entity id', async () => {
      const subscription = buildSubscription({ id: 9 });

      await repository.delete(subscription);

      expect(model.delete).toHaveBeenCalledWith({ id: 9 });
    });
  });

  describe(NotificationSubscriptionRepository.prototype.iterate.name, () => {
    it('iterates paginated subscriptions', async () => {
      const first = buildSubscription({ id: 1 });
      const second = buildSubscription({ id: 2, channelId: '456' });
      model.find.mockResolvedValueOnce([first, second]);

      const result: NotificationSubscription[] = [];
      for await (const item of repository.iterate()) {
        result.push(item);
      }

      expect(result).toEqual([first, second]);
      expect(model.find).toHaveBeenNthCalledWith(1, { skip: 0, take: 100 });
      expect(model.find).toHaveBeenCalledTimes(1);
    });
  });
});
