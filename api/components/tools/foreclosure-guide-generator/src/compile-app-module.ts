import { NestFactory } from '@nestjs/core';
import { DynamicModule, INestApplication, Logger } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SupportedCurrencies } from '@nftfi.api/core';
import { FxRateConfigToken } from '@nftfi.api/modules/fx-rate-provider';
import { buildDatasource } from '@nftfi.api/repositories/postgres';
import { MarketLoan, MarketLoanRepository } from '@nftfi.api/repositories/postgres/market-loan';
import { ForeclosureGuideService } from './foreclosure-guide.service';
import { EthCurrencies } from './currencies';

interface Options {
  postgres: {
    uri: string;
  };
}

export const compileAppModule = async (options: Options): Promise<INestApplication> => {
  const appModule: DynamicModule = {
    module: class AppModule {},
    imports: [
      TypeOrmModule.forRootAsync({
        useFactory: () => buildDatasource({ url: options.postgres.uri }).options
      }),
      SupportedCurrencies.forRootAsync({
        useFactory: () => new SupportedCurrencies(EthCurrencies)
      }),
      {
        module: MarketLoanRepository,
        global: true,
        imports: [TypeOrmModule.forFeature([MarketLoan])],
        providers: [MarketLoanRepository, { provide: FxRateConfigToken, useValue: { ethusdt: 0 } }],
        exports: [MarketLoanRepository]
      }
    ],
    providers: [ForeclosureGuideService, { provide: Logger, useValue: new Logger('Foreclosure Guide Generator') }]
  };

  const app = await NestFactory.create(appModule);

  await app.init();

  return app;
};
