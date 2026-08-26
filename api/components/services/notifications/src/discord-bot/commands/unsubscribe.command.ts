import { SlashCommandPipe } from '@discord-nestjs/common';
import { Injectable, Logger, UseGuards } from '@nestjs/common';
import { Command, InteractionEvent, Handler } from '@discord-nestjs/core';
import { CommandInteraction } from 'discord.js';
import { NotificationSubscriptionRepository } from '@nftfi.api/repositories/postgres/notification-subscription';
import { CommandType, SubscriptionType } from '../discord-bot.types';
import { SubscribeDto } from '../dtos';
import { IsAdminUserGuard } from '../guards';
import { DiscordBotService } from '../discord-bot.service';

@Command({
  name: CommandType.Unsubscribe,
  description: 'Unsubscribe from the given nft contracts'
})
@Injectable()
export class UnsubscribeCommand {
  private readonly logger = new Logger(UnsubscribeCommand.name);

  constructor(
    private readonly subscriptionRepository: NotificationSubscriptionRepository,
    private readonly discordBotService: DiscordBotService
  ) {}

  @Handler()
  @UseGuards(IsAdminUserGuard)
  async handle(
    @InteractionEvent() event: Pick<CommandInteraction, 'channel' | 'channelId'>,
    @InteractionEvent(SlashCommandPipe) dto: SubscribeDto
  ): Promise<string> {
    if (!dto?.contracts) {
      return 'Oops! You need to say what contract(s) you want to unsubscribe from.';
    }

    const existingSub = await this.subscriptionRepository.findByChannelId(event.channelId);
    if (!existingSub) {
      return "It seems like you don't have any active subscriptions.";
    }

    const actualPrefix = await this.discordBotService.getPrefixByChannelId(event.channelId);

    const entries: string[] = [];
    try {
      for (const contract of dto.contracts) {
        if (!contract.length) continue;

        const input = this.discordBotService.parseUserInput(contract);
        if (!input) {
          event.channel.send(
            `Sorry, the subscription \`${contract}\` is invalid. Type \`${actualPrefix}help\` for correct syntax.`
          );
          continue;
        }

        if (input.type === SubscriptionType.AllContracts) {
          await this.subscriptionRepository.update(existingSub, { inputs: [] });
          this.logger.log(`Channel ${event.channelId} unsubscribed from all contracts`);
          return `You're now unsubscribed from all contracts`;
        }

        await this.subscriptionRepository.update(existingSub, {
          inputs: existingSub.inputs.filter(i => i !== contract)
        });
        entries.push(contract);
      }
    } catch (error) {
      this.logger.error(error);
      return 'Something went wrong ;(';
    }
    if (!entries.length) {
      return 'No valid contracts were found in your input';
    }

    this.logger.log(`Channel ${event.channelId} unsubscribed from ${entries.join(', ')}`);
    return `You're now unsubscribed from \`${entries.join(', ')}\``;
  }
}
