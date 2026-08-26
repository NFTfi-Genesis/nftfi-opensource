import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  Notification,
  NotificationChannel,
  NotificationRepository
} from '@nftfi.api/repositories/postgres/notification';
import { createTypeormRepositoryMock, MockTypeormRepository } from '../factories';

const buildNotification = (overrides: Partial<Notification> = {}): Notification =>
  ({
    id: 1,
    key: 'comms-id',
    channel: NotificationChannel.Discord,
    sent: false,
    template: 'new-listing',
    recipient: '123',
    context: { nftCollateralId: '1' },
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-01T00:00:00.000Z'),
    ...overrides
  } as Notification);

describe(NotificationRepository.name, () => {
  let repository: NotificationRepository;
  let model: MockTypeormRepository<Notification> & { delete: jest.Mock };

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        NotificationRepository,
        {
          provide: getRepositoryToken(Notification),
          useValue: createTypeormRepositoryMock<Notification>({
            delete: jest.fn()
          })
        }
      ]
    }).compile();

    repository = moduleRef.get(NotificationRepository);
    model = moduleRef.get(getRepositoryToken(Notification));
  });

  describe(NotificationRepository.prototype.upsert.name, () => {
    it('creates and upserts by key, template and recipient', async () => {
      const draft = {
        key: 'comms-id',
        channel: NotificationChannel.Discord,
        sent: false,
        template: 'new-listing',
        recipient: '123',
        context: { nftCollateralId: '1' }
      };
      const created = buildNotification();
      model.create.mockReturnValue(created);

      await repository.upsert(draft);

      expect(model.create).toHaveBeenCalledWith(draft);
      expect(model.upsert).toHaveBeenCalledWith(created, ['key', 'template', 'recipient']);
    });
  });

  describe(NotificationRepository.prototype.markAsSent.name, () => {
    it('marks notification as sent by id', async () => {
      const notification = buildNotification({ id: 10 });

      await repository.markAsSent(notification);

      expect(model.update).toHaveBeenCalledWith({ id: 10 }, { sent: true });
    });
  });

  describe(NotificationRepository.prototype.deleteNotSentByRecipient.name, () => {
    it('deletes pending notifications for recipient', async () => {
      await repository.deleteNotSentByRecipient('abc');

      expect(model.delete).toHaveBeenCalledWith({ recipient: 'abc', sent: false });
    });
  });

  describe(NotificationRepository.prototype.exists.name, () => {
    it('returns true when notification exists', async () => {
      model.findOne.mockResolvedValue(buildNotification());

      await expect(repository.exists('k1', 'tpl', 'recipient')).resolves.toBe(true);
      expect(model.findOne).toHaveBeenCalledWith({ where: { key: 'k1', template: 'tpl', recipient: 'recipient' } });
    });

    it('returns false when notification does not exist', async () => {
      model.findOne.mockResolvedValue(null);

      await expect(repository.exists('k1', 'tpl', 'recipient')).resolves.toBe(false);
    });
  });

  describe(NotificationRepository.prototype.iterateOverPendingPerChannel.name, () => {
    it('yields pending notifications ordered by createdAt', async () => {
      const notification = buildNotification();
      model.find.mockResolvedValueOnce([notification]);

      const result: Notification[] = [];
      for await (const item of repository.iterateOverPendingPerChannel(NotificationChannel.Discord)) {
        result.push(item);
      }

      expect(result).toEqual([notification]);
      expect(model.find).toHaveBeenCalledWith({
        where: { sent: false, channel: NotificationChannel.Discord },
        order: { createdAt: 'ASC' },
        skip: 0,
        limit: 100
      });
    });
  });
});
