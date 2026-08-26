import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import Discord from 'discord.js';
import { NotificationSubscriptionRepository } from '@nftfi.api/repositories/postgres/notification-subscription';
import { DEFAULT_PREFIX } from '../discord-bot.types';

@Injectable()
export class IsUserPrefixGuard implements CanActivate {
  constructor(private readonly subscriptionRepository: NotificationSubscriptionRepository) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const message: Discord.Message = context.getArgs()[0];

    const subs = await this.subscriptionRepository.findByChannelId(message.channel.id);
    const actualPrefix = subs?.prefix || DEFAULT_PREFIX;
    if (!message.content.startsWith(actualPrefix)) {
      return false;
    }

    return true;
  }
}
