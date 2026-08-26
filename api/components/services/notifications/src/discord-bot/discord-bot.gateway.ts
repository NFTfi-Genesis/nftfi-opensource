import { InjectDiscordClient, MessageEvent, On, Once } from '@discord-nestjs/core';
import Discord, { GuildTextBasedChannel } from 'discord.js';
import { Injectable, Logger, UseGuards, UseInterceptors } from '@nestjs/common';
import { PrefixCommandPipe } from '@discord-nestjs/common';
import { HelpCommand, SetPrefixCommand, SubscribeCommand, UnsubscribeCommand, ViewCommand } from './commands';
import { IsAdminUserGuard, IsUserPrefixGuard } from './guards';
import { SetPrefixDto, SubscribeDto } from './dtos';
import { AnyPrefixCommandInterceptor } from './any-prefix-command.interceptor';
import { CommandType } from './discord-bot.types';
import { DiscordBotService } from './discord-bot.service';

@Injectable()
export class DiscordBotGateway {
  private readonly logger = new Logger(DiscordBotGateway.name);

  constructor(
    @InjectDiscordClient() private readonly client: Discord.Client,
    private readonly discordBotService: DiscordBotService,
    private readonly helpCommand: HelpCommand,
    private readonly viewCommand: ViewCommand,
    private readonly setPrefixCommand: SetPrefixCommand,
    private readonly subscribeCommand: SubscribeCommand,
    private readonly unsubscribeCommand: UnsubscribeCommand
  ) {}

  @Once('ready')
  onReady(): void {
    this.logger.log(`Bot ${this.client.user.tag} was started!`);
  }

  @On('shardError')
  onShardError(error: Error, shardId: number): void {
    this.logger.error(`Shard ${shardId} error: ${error.message}`);
  }

  @On('messageCreate')
  @UseGuards(IsAdminUserGuard, IsUserPrefixGuard)
  @UseInterceptors(new AnyPrefixCommandInterceptor(CommandType.Help))
  async onHelpMessage(@MessageEvent() message: Discord.Message): Promise<string> {
    return this.helpCommand.handle(message);
  }

  @On('messageCreate')
  @UseGuards(IsAdminUserGuard, IsUserPrefixGuard)
  @UseInterceptors(new AnyPrefixCommandInterceptor(CommandType.View))
  async onViewMessage(@MessageEvent() message: Discord.Message): Promise<string> {
    return this.viewCommand.handle(message);
  }

  @On('messageCreate')
  @UseGuards(IsAdminUserGuard, IsUserPrefixGuard)
  @UseInterceptors(new AnyPrefixCommandInterceptor(CommandType.SetPrefix))
  async onSetPrefixMessage(
    @MessageEvent() message: Discord.Message,
    @MessageEvent(PrefixCommandPipe) dto: SetPrefixDto
  ): Promise<string> {
    return this.setPrefixCommand.handle(message, dto);
  }

  @On('messageCreate')
  @UseGuards(IsAdminUserGuard, IsUserPrefixGuard)
  @UseInterceptors(new AnyPrefixCommandInterceptor(CommandType.Subscribe))
  async onSubscribeMessage(
    @MessageEvent() event: Discord.Message,
    @MessageEvent(PrefixCommandPipe) dto: SubscribeDto
  ): Promise<string | void> {
    return this.subscribeCommand.handle(
      { channelId: event.channelId, channel: event.channel as GuildTextBasedChannel, reply: event.reply.bind(event) },
      dto
    );
  }

  @On('messageCreate')
  @UseGuards(IsAdminUserGuard, IsUserPrefixGuard)
  @UseInterceptors(new AnyPrefixCommandInterceptor(CommandType.Unsubscribe))
  async onUnsubscribeMessage(
    @MessageEvent() event: Discord.Message,
    @MessageEvent(PrefixCommandPipe) dto: SubscribeDto
  ): Promise<string | void> {
    return this.unsubscribeCommand.handle(
      { channelId: event.channelId, channel: event.channel as GuildTextBasedChannel },
      dto
    );
  }

  @On('channelDelete')
  async onChannelDelete(channel: Discord.Channel): Promise<void> {
    await this.discordBotService.deleteSubscriptionByChannelId(channel.id);
  }
}
