import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Mutex } from '@nftfi.api/core';
import { OfferV1Service } from './offer-v1.service';

@Injectable()
export class OfferV1Scheduler {
  constructor(private readonly offerV1Service: OfferV1Service) {}

  @Cron(CronExpression.EVERY_MINUTE)
  @Mutex()
  async onDeleteExpired(): Promise<void> {
    await this.offerV1Service.deleteExpired();
  }
}
