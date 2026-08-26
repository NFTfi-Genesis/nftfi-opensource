import { Notification } from './notification.entity';

export enum NotificationChannel {
  Email = 'email',
  Discord = 'discord'
}

export type DraftNotification = Pick<Notification, 'key' | 'channel' | 'template' | 'recipient' | 'context' | 'sent'>;
