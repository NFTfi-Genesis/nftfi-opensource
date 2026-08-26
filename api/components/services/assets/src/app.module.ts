import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { HttpModuleOptions } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SupportedCurrencies } from '@nftfi.api/core';
import { HealthModule } from '@nftfi.api/modules/health';
import { ClientOptions } from '@nftfi.api/facades/queue';
import { AlchemyFacade } from '@nftfi.api/facades/alchemy';
import { OpenSeaFacade } from '@nftfi.api/facades/opensea';
import { NftPriceFloorFacade } from '@nftfi.api/facades/nft-price-floor';
import { EthersProviderModule } from '@nftfi.api/modules/ethers-provider';
import { FxRatesFacade } from '@nftfi.api/facades/fx-rates';
import { buildDatasource } from '@nftfi.api/repositories/postgres';
import { GcpStorageFacade } from '@nftfi.api/facades';
import { AssetsFacade } from '@nftfi.api/facades/assets';
import config, { Config } from './config';
import { CacheModuleProvider } from './providers/cache-module.provider';
import { CollectionModule } from './collection';
import { AssetModule } from './asset';
import { MediaProcessorService } from './media-processor.service';
import { PodResourceGuardService } from './pod-resource-guard.service';
import { FxRateModule } from './fx-rate';
import { AssetContract } from './asset-contract';

const APP_NAME = 'assets';

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
    SupportedCurrencies.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) =>
        configService.get<Config['supportedCurrencies']>('supportedCurrencies')!
    }),
    CacheModuleProvider,
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const config = configService.get<Config['postgres']>('postgres')!;
        return buildDatasource(config).options;
      }
    }),
    AlchemyFacade.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService): HttpModuleOptions => {
        const config = configService.get<Config['alchemy']>('alchemy')!;
        return {
          baseURL: config.url,
          headers: {
            'x-api-key': config.key
          }
        };
      }
    }),
    OpenSeaFacade.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService): HttpModuleOptions => {
        const config = configService.get<Config['opensea']>('opensea')!;
        return {
          baseURL: config.url,
          headers: {
            'x-api-key': config.key
          }
        };
      }
    }),
    NftPriceFloorFacade.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const config = configService.get<Config['npf']>('npf')!;
        return {
          baseURL: config.url,
          headers: {
            'x-rapidapi-key': config.key
          }
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
    GcpStorageFacade.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        projectId: configService.get<string>('gcp.projectId')!
      })
    }),
    AssetsFacade.forRoot(ServiceFacadeProviderOptions),
    FxRatesFacade.forRoot(ServiceFacadeProviderOptions),
    AssetContract.forRoot(),
    MediaProcessorService.forRoot(),
    PodResourceGuardService.forRoot(),
    HealthModule,
    AssetModule,
    CollectionModule,
    FxRateModule
  ]
})
export class AppModule {}
