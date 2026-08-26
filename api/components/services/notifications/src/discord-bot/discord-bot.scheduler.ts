import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Mutex } from '@nftfi.api/core';
import { DiscordBotService } from './discord-bot.service';

@Injectable()
export class DiscordBotScheduler {
  constructor(private readonly discordBotService: DiscordBotService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  @Mutex()
  async handleSendPendingNotifications(): Promise<void> {
    await this.discordBotService.sendPendingNotifications();
  }
}
