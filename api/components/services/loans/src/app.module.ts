import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-ioredis-yet';
import { HealthModule } from '@nftfi.api/modules/health';
import { SupportedCurrencies } from '@nftfi.api/core';
import { AccountsFacade } from '@nftfi.api/facades/accounts';
import { AssetsFacade } from '@nftfi.api/facades/assets';
import { EmailNotificationsFacade } from '@nftfi.api/facades/email-notifications';
import { DiscordNotificationsFacade } from '@nftfi.api/facades/discord-notifications';
import { ClientOptions } from '@nftfi.api/facades/queue';
import { FxRatesFacade } from '@nftfi.api/facades/fx-rates';
import { LoansFacade } from '@nftfi.api/facades/loans';
import { OffersFacade } from '@nftfi.api/facades/offers';
import { ListingsFacade } from '@nftfi.api/facades/listings';
import { EthereumEvent, EthereumEventRepository } from '@nftfi.api/repositories/postgres/ethereum-event';
import { buildDatasource } from '@nftfi.api/repositories/postgres';
import { FxRateProviderModule } from '@nftfi.api/modules/fx-rate-provider';
import { EthersObserverModule, EventArchiveRepositoryToken } from '@nftfi.api/modules/ethers-observer';
import { EthersProviderModule } from '@nftfi.api/modules/ethers-provider';
import config, { Config } from './config';
import { LoanLegacyModule } from './loan-legacy';
import { LoanMetadataModule } from './loan-metadata';
import { LoanV1Module } from './loan-v1';
import { AnalyticsV1Module } from './analytics-v1';
import { LoanNotificationModule } from './loan-notification';
import { LoanSubscribersModule } from './subscribers/loan-subscriber.module';

const APP_NAME = 'loans';

export const ServiceFacadeProviderOptions: Pick<ClientOptions, 'configCallback' | 'caller'> = {
  configCallback: (configService: ConfigService) => ({
    urls: [configService.get<Config['rabbitmq']>('rabbitmq')!.url]
  }),
  caller: APP_NAME
};

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ConfigModule.forRoot({ load: [config], isGlobal: true }),
    AccountsFacade.forRoot(ServiceFacadeProviderOptions),
    AssetsFacade.forRoot(ServiceFacadeProviderOptions),
    EmailNotificationsFacade.forRoot(ServiceFacadeProviderOptions),
    DiscordNotificationsFacade.forRoot(ServiceFacadeProviderOptions),
    FxRatesFacade.forRoot(ServiceFacadeProviderOptions),
    LoansFacade.forRoot(ServiceFacadeProviderOptions),
    OffersFacade.forRoot(ServiceFacadeProviderOptions),
    ListingsFacade.forRoot(ServiceFacadeProviderOptions),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const config = configService.get<Config['postgres']>('postgres')!;
        return buildDatasource(config).options;
      }
    }),
    {
      module: EthereumEventRepository,
      global: true,
      imports: [TypeOrmModule.forFeature([EthereumEvent])],
      providers: [
        EthereumEventRepository,
        { provide: EventArchiveRepositoryToken, useExisting: EthereumEventRepository }
      ],
      exports: [EthereumEventRepository, EventArchiveRepositoryToken]
    },
    EthersProviderModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const ethersConfig = config.get<Config['ethereum']>('ethereum')!;
        return {
          provider: {
            url: ethersConfig.provider.url
          }
        };
      }
    }),
    EthersObserverModule.forRootAsync({
      tokens: { eventArchiveRepository: EthereumEventRepository },
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const ethersConfig = config.get<Config['ethereum']>('ethereum')!;
        return {
          replay: {
            enabled: ethersConfig.replay.enabled,
            chunkSize: ethersConfig.replay.chunkSize
          }
        };
      }
    }),
    CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (config: ConfigService<Config>) => {
        const redisConfig: Config['redis'] = config.get('redis')!;
        const store = await redisStore({
          port: redisConfig.port,
          host: redisConfig.host
        });

        return {
          store,
          ttl: 60 * 60 * 24 * 7
        };
      }
    }),
    SupportedCurrencies.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) =>
        configService.get<Config['supportedCurrencies']>('supportedCurrencies')!
    }),
    LoanMetadataModule,
    LoanNotificationModule,
    LoanSubscribersModule,
    LoanLegacyModule,
    LoanV1Module,
    AnalyticsV1Module,
    FxRateProviderModule,
    HealthModule
  ]
})
export class AppModule {}
