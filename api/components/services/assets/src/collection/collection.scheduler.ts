import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Mutex } from '@nftfi.api/core';
import { CollectionService } from './collection.service';

@Injectable()
export class CollectionScheduler {
  constructor(private readonly service: CollectionService) {}

  @Cron(CronExpression.EVERY_12_HOURS)
  @Mutex()
  async handleUpdateTokenRanges(): Promise<void> {
    await this.service.updateTokenRanges();
  }

  @Cron(CronExpression.EVERY_HOUR)
  @Mutex()
  async handleUpdateAllRankings(): Promise<void> {
    await this.service.updateAllRankings();
  }

  @Cron(CronExpression.EVERY_HOUR)
  @Mutex()
  async handleUpdateMissingImageUrls(): Promise<void> {
    await this.service.updateMissingImageUrls();
  }

  @Cron(CronExpression.EVERY_HOUR)
  @Mutex()
  async handleValidateAndRefreshLinks(): Promise<void> {
    await this.service.validateAndRefreshLinks();
  }

  @Cron(CronExpression.EVERY_HOUR)
  @Mutex()
  async handleUpdateMissingNpfSlugs(): Promise<void> {
    await this.service.updateMissingNpfSlugs();
  }
}
