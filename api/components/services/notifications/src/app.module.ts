import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HealthModule } from '@nftfi.api/modules/health';
import { buildDatasource } from '@nftfi.api/repositories/postgres';
import config, { Config } from './config';
import { MailerModule } from './mailer';
import { DiscordBotModule } from './discord-bot';
import { CacheModuleProvider } from './cache-module.provider';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ConfigModule.forRoot({ load: [config], isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const config = configService.get<Config['postgres']>('postgres');
        return buildDatasource(config).options;
      }
    }),
    CacheModuleProvider,
    MailerModule,
    DiscordBotModule,
    HealthModule
  ]
})
export class AppModule {}
