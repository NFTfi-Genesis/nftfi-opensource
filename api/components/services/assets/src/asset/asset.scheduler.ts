import { Cron, CronExpression } from '@nestjs/schedule';
import { Injectable } from '@nestjs/common';
import { Mutex } from '@nftfi.api/core';
import { AssetService } from './asset.service';

@Injectable()
export class AssetScheduler {
  constructor(private readonly assetService: AssetService) {}

  @Cron(CronExpression.EVERY_HOUR)
  @Mutex()
  async handleEmptyAssets(): Promise<void> {
    await this.assetService.validateAndRefreshLinks();
  }

  @Cron(CronExpression.EVERY_HOUR)
  @Mutex()
  async handleUpdateMissingImageUrls(): Promise<void> {
    await this.assetService.updateMissingImageUrls();
  }
}
