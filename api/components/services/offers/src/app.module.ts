import { CacheModule } from '@nestjs/cache-manager';
import { Logger, Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RedisStore, redisStore } from 'cache-manager-ioredis-yet';
import { buildDatasource } from '@nftfi.api/repositories/postgres';
import { SupportedCurrencies } from '@nftfi.api/core';
import { HealthModule } from '@nftfi.api/modules/health';
import { EthersProviderModule } from '@nftfi.api/modules/ethers-provider';
import { FxRateProviderModule } from '@nftfi.api/modules/fx-rate-provider';
import { AuthGuardModule } from '@nftfi.api/modules/auth-guard';
import { ClientOptions } from '@nftfi.api/facades/queue';
import { AccountsFacade } from '@nftfi.api/facades/accounts';
import { EmailNotificationsFacade } from '@nftfi.api/facades/email-notifications';
import { DiscordNotificationsFacade } from '@nftfi.api/facades/discord-notifications';
import { AssetsFacade } from '@nftfi.api/facades/assets';
import { FxRatesFacade } from '@nftfi.api/facades/fx-rates';
import { OffersFacade } from '@nftfi.api/facades/offers';
import { GnosisModule } from '@nftfi.api/facades/gnosis';
import config, { Config } from './config';
import { OfferNotificationModule } from './offer-notification';
import { OfferLegacyModule } from './offer-legacy';
import { OfferV1Module } from './offer-v1';
import { ListingV1Module } from './listing-v1/listing-v1.module';
import { RenegotiationV1Module } from './renegotiation-v1';

const facadeOptions: Pick<ClientOptions, 'configCallback' | 'caller'> = {
  configCallback: (configService: ConfigService) => ({
    urls: [configService.get<Config['rabbitmq']>('rabbitmq')!.url]
  }),
  caller: 'offers'
};

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ConfigModule.forRoot({ load: [config], isGlobal: true }),
    AccountsFacade.forRoot(facadeOptions),
    EmailNotificationsFacade.forRoot(facadeOptions),
    DiscordNotificationsFacade.forRoot(facadeOptions),
    AssetsFacade.forRoot(facadeOptions),
    FxRatesFacade.forRoot(facadeOptions),
    OffersFacade.forRoot(facadeOptions),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const config = configService.get<Config['postgres']>('postgres')!;
        return buildDatasource(config).options;
      }
    }),
    GnosisModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        url: configService.get<Config['gnosis']['urlTransaction']>('gnosis.urlTransaction')!
      })
    }),
    CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService<Config>) => {
        const redisConfig: Config['redis'] = configService.get('redis')!;
        const store = await redisStore({
          host: redisConfig.host,
          port: redisConfig.port
        }).catch(Logger.error);

        return {
          store: store as RedisStore,
          ttl: 1000 * 60 * 60 * 24 * 7
        };
      }
    }),
    EthersProviderModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const config = configService.get<Config['ethereum']>('ethereum')!;
        return {
          provider: {
            url: config.provider.url
          }
        };
      }
    }),
    SupportedCurrencies.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) =>
        configService.get<Config['supportedCurrencies']>('supportedCurrencies')!
    }),
    AuthGuardModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<Config['jwt']['secret']>('jwt.secret')!
      })
    }),
    FxRateProviderModule,
    OfferNotificationModule,
    OfferLegacyModule,
    OfferV1Module,
    ListingV1Module,
    RenegotiationV1Module,
    HealthModule
  ],
  controllers: [],
  providers: []
})
export class AppModule {}
