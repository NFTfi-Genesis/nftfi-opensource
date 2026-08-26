import { NotificationSubscription } from './notification-subscription.entity';

export type DraftNotificationSubscription = Pick<NotificationSubscription, 'channelId' | 'prefix' | 'inputs'>;
