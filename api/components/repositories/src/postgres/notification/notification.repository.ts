import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository as RepositoryType } from 'typeorm';
import { Repository } from '../repository';
import { Notification } from './notification.entity';
import { DraftNotification, NotificationChannel } from './notification.types';

@Injectable()
export class NotificationRepository extends Repository {
  constructor(@InjectRepository(Notification) private readonly model: RepositoryType<Notification>) {
    super();
  }

  async upsert(data: DraftNotification): Promise<void> {
    const notification = this.model.create(data);
    await this.model.upsert(notification, ['key', 'template', 'recipient'] as (keyof Notification)[]);
  }

  async markAsSent(notification: Notification): Promise<void> {
    await this.model.update({ id: notification.id }, { sent: true });
  }

  async deleteNotSentByRecipient(recipient: string): Promise<void> {
    await this.model.delete({ recipient, sent: false });
  }

  async exists(key: string, template: string, recipient: string): Promise<boolean> {
    return !!(await this.model.findOne({ where: { key, template, recipient } }));
  }

  async *iterateOverPendingPerChannel(channel: NotificationChannel): AsyncGenerator<Notification> {
    yield* this._iterate(async opts =>
      this.model.find({
        where: { sent: false, channel },
        order: { createdAt: 'ASC' },
        ...opts
      })
    );
  }
}
