import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DiscordModule } from '@discord-nestjs/core';
import { GatewayIntentBits, Partials } from 'discord.js';
import { Notification, NotificationRepository } from '@nftfi.api/repositories/postgres/notification';
import {
  NotificationSubscription,
  NotificationSubscriptionRepository
} from '@nftfi.api/repositories/postgres/notification-subscription';
import { DiscordBotGateway } from './discord-bot.gateway';
import { DiscordBotService } from './discord-bot.service';
import { DiscordBotController } from './discord-bot.controller';
import { HelpCommand, SetPrefixCommand, SubscribeCommand, UnsubscribeCommand, ViewCommand } from './commands';
import { IsAdminUserGuard, IsUserPrefixGuard } from './guards';
import { DiscordEmbedBuilderService } from './discord-embed-builder.service';
import { DiscordBotScheduler } from './discord-bot.scheduler';

@Module({
  imports: [
    TypeOrmModule.forFeature([Notification, NotificationSubscription]),
    DiscordModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        token: configService.get<string>('discord.bot.token'),
        discordClientOptions: {
          intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
          partials: [Partials.Message]
        }
      })
    })
  ],
  providers: [
    HelpCommand,
    ViewCommand,
    SetPrefixCommand,
    SubscribeCommand,
    UnsubscribeCommand,
    IsAdminUserGuard,
    IsUserPrefixGuard,
    DiscordBotGateway,
    DiscordBotService,
    DiscordEmbedBuilderService,
    DiscordBotScheduler,
    NotificationRepository,
    NotificationSubscriptionRepository
  ],
  controllers: [DiscordBotController]
})
export class DiscordBotModule {}
