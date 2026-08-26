import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Mutex } from '@nftfi.api/core';
import { OfferNotificationService } from './offer-notification.service';

@Injectable()
export class OfferNotificationScheduler {
  constructor(private readonly loanNotificationService: OfferNotificationService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  @Mutex()
  async onLiquiditySummary(): Promise<void> {
    await this.loanNotificationService.notifyBorrowersAboutLiquidutyOffers();
  }
}
