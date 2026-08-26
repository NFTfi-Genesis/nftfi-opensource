import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { FxRatesFacade } from '@nftfi.api/facades/fx-rates';
import { type FxRateConfig, FxRateConfigToken } from './fx-rate-provider.types';

@Injectable()
export class FxRateProviderService {
  private readonly logger = new Logger(FxRateProviderService.name);

  constructor(private readonly fxRatesFacade: FxRatesFacade, @Inject(FxRateConfigToken) private config: FxRateConfig) {}

  onApplicationBootstrap(): void {
    this.handleUpdateFxRates();
  }

  @Cron(CronExpression.EVERY_10_MINUTES)
  async handleUpdateFxRates(): Promise<void> {
    const fxRateEthUsd = await this.fxRatesFacade.getLatestRate();
    this.logger.log(`Latest FX rate ETH/USD is ${fxRateEthUsd}`);
    this.config.ethusdt = fxRateEthUsd;
  }
}
