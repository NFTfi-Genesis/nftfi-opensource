import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-ioredis-yet';
import { HealthModule } from '@nftfi.api/modules/health';
import { buildDatasource } from '@nftfi.api/repositories/postgres';
import { AuthGuardModule } from '@nftfi.api/modules/auth-guard';
import { EthersProviderModule } from '@nftfi.api/modules/ethers-provider';
import { ChainalysisModule } from '@nftfi.api/facades/chainalysis';
import { AccountModule } from './account';
import config, { Config } from './config';
import { AuthModule } from './auth';

@Module({
  imports: [
    ConfigModule.forRoot({ load: [config], isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const config = configService.get<Config['postgres']>('postgres')!;
        return buildDatasource(config).options;
      }
    }),
    CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (config: ConfigService<Config>) => {
        const redisConfig: Config['redis'] = config.get('redis')!;
        const store = await redisStore({
          host: redisConfig.host,
          port: redisConfig.port
        });

        return { store };
      }
    }),
    EthersProviderModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        provider: {
          url: configService.get<Config['ethereum']['provider']['url']>('ethereum.provider.url')!
        }
      })
    }),
    AuthModule,
    AccountModule,
    AuthGuardModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<Config['jwt']['secret']>('jwt.secret')!
      })
    }),
    ChainalysisModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        url: configService.get<Config['chainalysis']['url']>('chainalysis.url')!,
        apiKey: configService.get<Config['chainalysis']['apiKey']>('chainalysis.apiKey')!
      })
    }),
    HealthModule
  ],
  controllers: [],
  providers: []
})
export class AppModule {}
