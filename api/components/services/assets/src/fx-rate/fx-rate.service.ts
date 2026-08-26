import { last } from 'lodash';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { startOfDay, format, addDays } from 'date-fns';
import { plainToInstance } from 'class-transformer';
import { FxRate, FxRateRepository } from '@nftfi.api/repositories/postgres/fx-rate';
import { FxRateDto, FxSymbol } from '@nftfi.api/facades/fx-rates';
import { Config } from '../config';
import { type FxRateClient, FxRateClientProvider } from './fx-rate-client.provider';
import { FxTimeframe } from './fx-rate.types';

@Injectable()
export class FxRateService {
  private readonly logger = new Logger(FxRateService.name);

  constructor(
    @Inject(FxRateClientProvider.provide) private readonly client: FxRateClient,
    private readonly repository: FxRateRepository,
    private readonly configService: ConfigService
  ) {}

  async getLatest(symbol: FxSymbol): Promise<FxRate | null> {
    return await this.repository.findLatest(symbol);
  }

  async getAtDate(symbol: FxSymbol, date: Date): Promise<FxRate | null> {
    return await this.repository.findToDate(symbol, date);
  }

  async refreshEthUsdtRate(): Promise<void> {
    const symbol = FxSymbol.ETH_USDT;
    await this.assertClientReady(symbol, ['1h']);

    const entry = await this.repository.findLatest(FxSymbol.ETH_USDT);
    const today = startOfDay(new Date());
    if (!entry || entry.createdAt < today) {
      const startDate = entry
        ? entry.createdAt
        : this.configService.get<Config['fxrate']['startDate']>('fxrate.startDate');
      const timeframe: FxTimeframe = '1h';
      const startstr = format(startDate, 'yyyy-MM-dd');
      const endstr = format(today, 'yyyy-MM-dd');
      const totalRecords = await this.refreshHistoricalRates(symbol, timeframe, startDate, today);
      this.logger.log(`Refreshed ${totalRecords} historical FX rate for ${symbol} from ${startstr} to ${endstr}`);
      return;
    }

    await this.refreshTickerRates(symbol);
    this.logger.log(`Refreshed latest FX rate for ${symbol} at rate ${entry.rate}`);
  }

  async refreshHistoricalRates(
    symbol: FxSymbol,
    timeframe: FxTimeframe,
    startDate: Date,
    endDate: Date
  ): Promise<number> {
    let startTs = this.client.parse8601(startDate.toISOString());
    const endTs = this.client.parse8601(endDate.toISOString());
    let totalRecords = 0;

    while (startTs < endTs) {
      const records = await this.client.fetchOHLCV(symbol, timeframe, startTs, 200);
      if (!records.length) {
        startTs = addDays(new Date(startTs), 7).getTime();
        continue;
      }

      startTs = last(records)[0];
      totalRecords += records.length;

      await this.repository.upsert(
        records.map(([timestamp, , , , close]) => ({
          symbol,
          rate: close,
          createdAt: new Date(timestamp)
        }))
      );
      await new Promise(resolve => setTimeout(resolve, this.client.rateLimit));
    }
    return totalRecords;
  }

  async refreshTickerRates(symbol: FxSymbol): Promise<void> {
    const ticker = await this.client.fetchTicker(symbol);
    await this.repository.upsert([
      {
        symbol,
        rate: ticker.close,
        createdAt: new Date(ticker.timestamp)
      }
    ]);
  }

  private async assertClientReady(symbol: FxSymbol, timeframes: FxTimeframe[]): Promise<void> {
    const exchangeId = this.client.constructor.name;

    if (!this.client.has['fetchOHLCV']) {
      throw new Error(`${exchangeId} does not support fetching OHLCV data`);
    }

    for (const timeframe of timeframes) {
      if (!(timeframe in this.client.timeframes)) {
        throw new Error(`${timeframe} not supported by ${exchangeId}`);
      }
    }

    const markets = await this.client.loadMarkets();
    if (!(symbol in markets)) {
      throw new Error(`${symbol} not found on ${exchangeId}`);
    }
  }

  toDto(entity: FxRate): FxRateDto {
    const rawDto: FxRateDto = {
      symbol: entity.symbol as FxSymbol,
      rate: entity.rate,
      createdAt: entity.createdAt
    };

    return plainToInstance(FxRateDto, rawDto);
  }
}
