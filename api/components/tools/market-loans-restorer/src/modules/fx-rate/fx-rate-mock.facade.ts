import { Inject, Injectable } from '@nestjs/common';
import { roundToNearestMinutes } from 'date-fns';
import { Cache } from '@nftfi.api/core';
import { FxRatesFacade, FxSymbol } from '@nftfi.api/facades/fx-rates';
import { FxRateRepository } from '@nftfi.api/repositories/postgres/fx-rate';
import { type FxRateConfig, FxRateConfigToken } from '@nftfi.api/modules/fx-rate-provider';

const ONE_DAY_MS_TTL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

@Injectable()
export class FxRateMockFacade implements Pick<FxRatesFacade, 'getRateAtDate'> {
  constructor(
    private readonly fxRateRepository: FxRateRepository,
    @Inject(FxRateConfigToken) private readonly fxConfig: FxRateConfig
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const latestRate = await this.fxRateRepository.findLatest(FxSymbol.ETH_USDT);
    if (latestRate) {
      this.fxConfig.ethusdt = latestRate.rate;
    }
  }

  @Cache(
    (_i, date: Date) => `market-loans-restorer:fx-rates:eth-usdt:${roundToNearestMinutes(date).getTime() / 1000}`,
    ONE_DAY_MS_TTL
  )
  async getRateAtDate(date: Date): Promise<number> {
    const entry = await this.fxRateRepository.findToDate(FxSymbol.ETH_USDT, date);
    return entry?.rate || 0;
  }

  async getLatestRate(): Promise<number> {
    const entry = await this.fxRateRepository.findLatest(FxSymbol.ETH_USDT);
    return entry?.rate || 0;
  }
}
