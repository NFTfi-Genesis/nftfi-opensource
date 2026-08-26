import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Mutex } from '@nftfi.api/core';
import { MailerService } from './mailer.service';

@Injectable()
export class MailerScheduler {
  constructor(private readonly mailerService: MailerService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  @Mutex()
  async handleSendPendingNotifications(): Promise<void> {
    await this.mailerService.sendPendingNotifications();
  }
}
