import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Mutex } from '@nftfi.api/core';
import { ListingV1Service } from './listing-v1.service';

@Injectable()
export class ListingScheduler {
  constructor(private readonly listingService: ListingV1Service) {}

  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  @Mutex()
  async deleteTransferredListings(): Promise<void> {
    await this.listingService.deleteTransferredListings();
  }
}
