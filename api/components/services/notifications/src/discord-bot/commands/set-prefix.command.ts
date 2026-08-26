import { SlashCommandPipe } from '@discord-nestjs/common';
import { Injectable, Logger, UseGuards } from '@nestjs/common';
import { Command, InteractionEvent, Handler } from '@discord-nestjs/core';
import { CommandInteraction } from 'discord.js';
import { NotificationSubscriptionRepository } from '@nftfi.api/repositories/postgres/notification-subscription';
import { CommandType } from '../discord-bot.types';
import { SetPrefixDto } from '../dtos';
import { IsAdminUserGuard } from '../guards';
import { HelpCommand } from './help.command';

@Command({
  name: CommandType.SetPrefix,
  description: "Set the prefix for this bot to something else (the default is '!')"
})
@Injectable()
export class SetPrefixCommand {
  private readonly logger = new Logger(SetPrefixCommand.name);

  constructor(
    private readonly subscriptionRepository: NotificationSubscriptionRepository,
    private readonly helpCommand: HelpCommand
  ) {}

  @Handler()
  @UseGuards(IsAdminUserGuard)
  async handle(
    @InteractionEvent(SlashCommandPipe) event: Pick<CommandInteraction, 'channelId'>,
    @InteractionEvent(SlashCommandPipe) dto: SetPrefixDto
  ): Promise<string> {
    if (!dto?.prefix) {
      return 'Oops! You need to say what the new prefix should be.';
    }

    try {
      const existingSub = await this.subscriptionRepository.findByChannelId(event.channelId);
      if (existingSub && existingSub.prefix === dto.prefix) {
        return `The prefix is already set to '${dto.prefix}'!`;
      }
      await this.subscriptionRepository.update(existingSub, { prefix: dto.prefix });
      return `Ok, I'll respond to this new prefix '${dto.prefix}' from now on. \r\n${this.helpCommand.buildMessage(
        true,
        dto.prefix
      )}`;
    } catch (error) {
      this.logger.error(error);
      return 'Something went wrong ;(';
    }
  }
}
