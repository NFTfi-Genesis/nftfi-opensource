import { ConfigModule } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { CacheModule } from '@nestjs/cache-manager';
import { DynamicModule, INestApplication, Logger, Type } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { redisStore } from 'cache-manager-ioredis-yet';
import { SupportedCurrencies } from '@nftfi.api/core';
import { EthersProviderModule } from '@nftfi.api/modules/ethers-provider';
import { buildDatasource } from '@nftfi.api/repositories/postgres';
import { MarketLoan, MarketLoanProtocol, MarketLoanRepository } from '@nftfi.api/repositories/postgres/market-loan';
import { LoansFacade } from '@nftfi.api/facades/loans';
import { OffersFacade } from '@nftfi.api/facades/offers';
import { ListingsFacade } from '@nftfi.api/facades/listings';
import { LoanNotificationService } from '@nftfi.api/services/loans';
import { LoanHelperService } from '@nftfi.api/services/loans/subscribers/loan-helper.service';
import { EventArchiveReplayModule } from './modules/event-archive-replay.module';
import { ArcadeAdapterModule } from './modules/arcade-adapter.module';
import { BlurAdapterModule } from './modules/blur-adapter.module';
import { GondiAdapterModule } from './modules/gondi-adapter.module';
import { EthContracts, EthCurrencies } from './constants';
import { NftfiLoanModule } from './modules/nftfi-loan.module';
import { FxRateModule } from './modules/fx-rate';
import { AssetModule } from './modules/asset';

interface Options {
  label: string;
  protocols?: MarketLoanProtocol[];
  apiUrl: string;
  postgres: {
    uri: string;
  };
  cache: {
    uri: string;
  };
  ethereum: {
    provider: {
      uri: string;
    };
  };
}

export const compileAppModule = async (options: Options): Promise<INestApplication> => {
  const appModule: DynamicModule = {
    module: class AppModule {},
    imports: [
      ConfigModule.forRoot({
        isGlobal: true,
        load: [
          (): object => ({
            ethereum: {
              contracts: EthContracts
            }
          })
        ]
      }),
      CacheModule.registerAsync({
        isGlobal: true,
        useFactory: async () => {
          const url = new URL(options.cache.uri);
          const store = await redisStore({ port: Number(url.port), host: url.hostname });
          return {
            store,
            ttl: 60 * 60 * 24 * 7
          };
        }
      }),
      TypeOrmModule.forRootAsync({
        useFactory: () => buildDatasource({ url: options.postgres.uri }).options
      }),
      EthersProviderModule.forRootAsync({
        useFactory: () => ({
          provider: {
            url: options.ethereum.provider.uri
          }
        })
      }),
      {
        module: MarketLoanRepository,
        global: true,
        imports: [TypeOrmModule.forFeature([MarketLoan])],
        providers: [MarketLoanRepository],
        exports: [MarketLoanRepository]
      },
      {
        module: LoanNotificationService,
        global: true,
        providers: [
          {
            provide: LoanNotificationService,
            useValue: {
              notifyLoanStarted: async (): Promise<void> => Promise.resolve(),
              notifyLoanRenegotiated: async (): Promise<void> => Promise.resolve(),
              notifyLoanLiquidated: async (): Promise<void> => Promise.resolve(),
              notifyLoanRepaid: async (): Promise<void> => Promise.resolve()
            }
          }
        ],
        exports: [LoanNotificationService]
      },
      {
        module: ListingsFacade,
        global: true,
        providers: [
          {
            provide: ListingsFacade,
            useValue: { deleteByNftKey: async (): Promise<void> => Promise.resolve() }
          }
        ],
        exports: [ListingsFacade]
      },
      {
        module: LoanHelperService,
        global: true,
        providers: [
          LoanHelperService,
          {
            provide: LoansFacade,
            useValue: { invalidateCache: async (): Promise<void> => Promise.resolve() }
          },
          {
            provide: OffersFacade,
            useValue: {
              deleteWinningOffer: async (): Promise<void> => Promise.resolve(),
              invalidateCache: async (): Promise<void> => Promise.resolve()
            }
          }
        ],
        exports: [LoanHelperService]
      },
      SupportedCurrencies.forRootAsync({
        useFactory: () => new SupportedCurrencies(EthCurrencies)
      }),
      EventArchiveReplayModule.forRoot({ label: options.label }),
      FxRateModule.forRoot(),
      AssetModule.forRoot({ apiUrl: options.apiUrl }),
      ...getProtocolModules(options.protocols)
    ],
    providers: [{ provide: Logger, useValue: new Logger('Market-Loans Restorer') }]
  };

  const app = await NestFactory.create(appModule);

  await app.init();

  return app;
};

const getProtocolModules = (protocols: MarketLoanProtocol[]): Type[] => {
  if (!protocols?.length) {
    return [GondiAdapterModule, NftfiLoanModule, BlurAdapterModule];
  }

  const modules: Type[] = [];

  if (protocols.includes(MarketLoanProtocol.Gondi)) {
    modules.push(GondiAdapterModule);
  }

  if (protocols.includes(MarketLoanProtocol.Arcade)) {
    modules.push(ArcadeAdapterModule);
  }

  if (protocols.includes(MarketLoanProtocol.Blur)) {
    modules.push(BlurAdapterModule);
  }

  if (protocols.includes(MarketLoanProtocol.Nftfi)) {
    modules.push(NftfiLoanModule);
  }

  return modules;
};
