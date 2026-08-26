import { Command, InteractionEvent, Handler } from '@discord-nestjs/core';
import { SlashCommandPipe } from '@discord-nestjs/common';
import { Injectable, Logger } from '@nestjs/common';
import { CommandInteraction } from 'discord.js';
import { NotificationSubscriptionRepository } from '@nftfi.api/repositories/postgres/notification-subscription';
import { CommandType, DEFAULT_PREFIX } from '../discord-bot.types';
import { HelpCommand } from './help.command';

@Command({
  name: CommandType.View,
  description: 'Show nft contract subscriptions'
})
@Injectable()
export class ViewCommand {
  private readonly logger = new Logger(ViewCommand.name);
  constructor(
    private readonly subscriptionRepository: NotificationSubscriptionRepository,
    private readonly helpCommand: HelpCommand
  ) {}

  @Handler()
  async handle(
    @InteractionEvent(SlashCommandPipe) interraction: Pick<CommandInteraction, 'channelId'>
  ): Promise<string> {
    try {
      const subs = await this.subscriptionRepository.findByChannelId(interraction.channelId);
      const prefix = subs?.prefix || DEFAULT_PREFIX;
      if (!subs) {
        return `You're not subscribed to any contract events yet. ${this.helpCommand.buildMessage(false, prefix)}`;
      }

      const cs = (subs.inputs || []).join(', ');
      if (cs.length > 0) {
        return `You're subscribed to \`${cs}\`, your prefix is \`${prefix}\`. ${this.helpCommand.buildMessage(
          false,
          prefix
        )}`;
      } else {
        return `You're not subscribed to any contract events, your prefix is \`${prefix}\`. ${this.helpCommand.buildMessage(
          false,
          prefix
        )}`;
      }
    } catch (error) {
      this.logger.error(error);
      return 'Something went wrong ;(';
    }
  }
}
