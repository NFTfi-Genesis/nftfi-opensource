import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Mutex } from '@nftfi.api/core';
import { FxRateService } from './fx-rate.service';

@Injectable()
export class FxRateScheduler {
  constructor(private readonly fxRateService: FxRateService) {}

  onApplicationBootstrap(): void {
    this.handleRefreshEthUsdtRate();
  }

  @Cron(CronExpression.EVERY_10_MINUTES)
  @Mutex()
  async handleRefreshEthUsdtRate(): Promise<void> {
    await this.fxRateService.refreshEthUsdtRate();
  }
}
