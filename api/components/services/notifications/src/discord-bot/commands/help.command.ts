import { Command, InteractionEvent, Handler } from '@discord-nestjs/core';
import { SlashCommandPipe } from '@discord-nestjs/common';
import { Injectable, Logger } from '@nestjs/common';
import { CommandInteraction } from 'discord.js';
import { NotificationSubscriptionRepository } from '@nftfi.api/repositories/postgres/notification-subscription';
import { CommandType, DEFAULT_PREFIX } from '../discord-bot.types';

@Command({
  name: CommandType.Help,
  description: 'NFTfi Bot - Help info!'
})
@Injectable()
export class HelpCommand {
  private readonly logger = new Logger(HelpCommand.name);
  constructor(private readonly subscriptionRepository: NotificationSubscriptionRepository) {}

  @Handler()
  async handle(@InteractionEvent(SlashCommandPipe) event: Pick<CommandInteraction, 'channelId'>): Promise<string> {
    try {
      const subs = await this.subscriptionRepository.findByChannelId(event.channelId);
      const prefix = subs?.prefix || DEFAULT_PREFIX;
      if (!subs) {
        return `You're not subscribed to any contract events yet. ${this.buildMessage(false, prefix)}`;
      }

      const cs = (subs.inputs || []).join(', ');
      if (cs && cs.length > 0) {
        return `You're subscribed to \`${cs}\`, your prefix is \`${prefix}\`. ${this.buildMessage(false, prefix)}`;
      } else {
        return `You're not subscribed to any contract events, your prefix is \`${prefix}\`. ${this.buildMessage(
          false,
          prefix
        )}`;
      }
    } catch (error) {
      this.logger.error(error);
      return 'Something went wrong ;(';
    }
  }

  buildMessage(compact: boolean, prefix: string): string {
    if (compact) {
      return `\r\n(For more info, just say \`${prefix}help\`)`;
    } else {
      const intro =
        '**How It Works:** Once subscribed, the bot will send the relavant event notifications to the Discord channel(s) you called these commands from.';
      const helpView = `\`${prefix}view\` - check your subscriptions and prefix`;

      const helpSubscribeAll = `\`${prefix}subscribe *\` - subscribe to all contracts`;
      const helpUnSubscribeAll = `\`${prefix}unsubscribe *\` - unsubscribe from all contracts\r\n`;

      const helpSubscribeMulti = `\`${prefix}subscribe contract1 contract2\` - subscribe to one or more contracts`;
      const helpUnSubscribeMulti = `\`${prefix}unsubscribe contract1 contract2\` - unsubscribe from one or more contracts\r\n`;

      const helpSubscribeSingleItem = `\`${prefix}subscribe contract:123\` - subscribe to a single item in a collection`;
      const helpUnSubscribeSingleItem = `\`${prefix}unsubscribe contract:123\` - unsubscribe from a single item in a collection\r\n`;

      const helpSubscribeRanged = `\`${prefix}subscribe contract:11..99\` - subscribe to a range of items in a collection`;
      const helpUnSubscribeRanged = `\`${prefix}unsubscribe contract:11..99\` - unsubscribe from a range of items in a collection\r\n`;

      const helpSubscribeRangeTopBound = `\`${prefix}subscribe contract:..99\` - subscribe to a top bound range of items in a collection`;
      const helpUnSubscribeRangeTopBound = `\`${prefix}unsubscribe contract:..99\` - unsubscribe from a top bound range of items in a collection\r\n`;

      const helpSubscribeRangeBottomBound = `\`${prefix}subscribe contract:11..\` - subscribe to a bottom bound range of items in a collection`;
      const helpUnSubscribeRangeBottomBound = `\`${prefix}unsubscribe contract:11..\` - unsubscribe from a bottom bound range of items in a collection\r\n`;

      const helpPrefix = `\`${prefix}newprefix X\` - set a new prefix for this bot\r\n`;

      const helpAsk = `For more help, speak to a human on our discord server: https://discord.gg/nftfi`;

      const commands = [
        helpView,
        helpSubscribeAll,
        helpUnSubscribeAll,
        helpSubscribeMulti,
        helpUnSubscribeMulti,
        helpSubscribeSingleItem,
        helpUnSubscribeSingleItem,
        helpSubscribeRanged,
        helpUnSubscribeRanged,
        helpSubscribeRangeTopBound,
        helpUnSubscribeRangeTopBound,
        helpSubscribeRangeBottomBound,
        helpUnSubscribeRangeBottomBound,
        helpPrefix
      ].join(`\r\n`);

      return `\r\n\r\n${intro}\r\n\r\n${commands}\r\n\r\n${helpAsk}`;
    }
  }
}
