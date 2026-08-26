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
  name: CommandType.Subscribe,
  description: 'Subscribe to the given nft contracts'
})
@Injectable()
export class SubscribeCommand {
  private readonly logger = new Logger(SubscribeCommand.name);

  constructor(
    private readonly subscriptionRepository: NotificationSubscriptionRepository,
    private readonly discordBotService: DiscordBotService
  ) {}

  @Handler()
  @UseGuards(IsAdminUserGuard)
  async handle(
    @InteractionEvent() event: Pick<CommandInteraction, 'reply' | 'channel' | 'channelId'>,
    @InteractionEvent(SlashCommandPipe) dto: SubscribeDto
  ): Promise<string> {
    if (!dto?.contracts) {
      return 'Oops! You need to say what contract(s) you want to subscribe to.';
    }

    const actualPrefix = await this.discordBotService.getPrefixByChannelId(event.channelId);

    const entries: string[] = [];
    try {
      for (const contractType of dto.contracts) {
        if (!contractType.length) continue;

        const input = this.discordBotService.parseUserInput(contractType);
        if (!input) {
          event.channel.send(
            `Sorry, the subscription \`${contractType}\` is invalid. Type \`${actualPrefix}help\` for correct syntax.`
          );
          continue;
        }

        if (input.type === SubscriptionType.AllContracts) {
          await this.subscriptionRepository.upsert({
            channelId: event.channelId,
            inputs: [contractType]
          });

          this.logger.log(`Channel ${event.channelId} subscribed to all contracts`);
          return "You're now subscribed to all contracts";
        }

        const existingSub = await this.subscriptionRepository.findByChannelId(event.channelId);
        await this.subscriptionRepository.update(existingSub, { inputs: [...existingSub.inputs, contractType] });
        entries.push(contractType);
      }
    } catch (error) {
      this.logger.error(error);
      return 'Something went wrong ;(';
    }
    if (!entries.length) {
      return 'No valid contracts were found in your input';
    }

    this.logger.log(`Channel ${event.channelId} subscribed to ${entries.join(', ')}`);
    return `You're now subscribed to \`${entries.join(', ')}\``;
  }
}
