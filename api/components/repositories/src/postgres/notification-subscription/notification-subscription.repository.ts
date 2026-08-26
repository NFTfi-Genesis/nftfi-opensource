import { Injectable } from '@nestjs/common';
import { Repository as RepositoryType } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from '../repository';
import { NotificationSubscription } from './notification-subscription.entity';
import { DraftNotificationSubscription } from './notification-subscription.types';

@Injectable()
export class NotificationSubscriptionRepository extends Repository {
  constructor(
    @InjectRepository(NotificationSubscription) private readonly model: RepositoryType<NotificationSubscription>
  ) {
    super();
  }

  async findByChannelId(channelId: string): Promise<NotificationSubscription> {
    return this.model.findOne({ where: { channelId } });
  }

  async upsert(data: DraftNotificationSubscription): Promise<void> {
    const notification = this.model.create(data);
    await this.model.upsert(notification, ['channelId'] as (keyof NotificationSubscription)[]);
  }

  async update(entity: NotificationSubscription, data: Partial<DraftNotificationSubscription>): Promise<void> {
    await this.model.update({ id: entity.id }, data);
  }

  async delete(entity: NotificationSubscription): Promise<void> {
    await this.model.delete({ id: entity.id });
  }

  async *iterate(): AsyncGenerator<NotificationSubscription> {
    yield* this._iterate(opts => this.model.find({ skip: opts.skip, take: opts.limit }));
  }
}
