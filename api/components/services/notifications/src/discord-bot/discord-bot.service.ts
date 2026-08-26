import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import Discord, { DiscordAPIError } from 'discord.js';
import { InjectDiscordClient } from '@discord-nestjs/core';
import { NotificationChannel, NotificationRepository } from '@nftfi.api/repositories/postgres/notification';
import { NotificationSubscriptionRepository } from '@nftfi.api/repositories/postgres/notification-subscription';
import { DiscordMessageDto, DiscordMessageType } from '@nftfi.api/facades/discord-notifications';
import { DEFAULT_PREFIX, DiscordComms, SubscriptionType, UserInput } from './discord-bot.types';
import { DiscordEmbedBuilderService } from './discord-embed-builder.service';

@Injectable()
export class DiscordBotService {
  private readonly logger = new Logger(DiscordBotService.name);

  constructor(
    private readonly notificationRepository: NotificationRepository,
    private readonly subscriptionRepository: NotificationSubscriptionRepository,
    private readonly discordEmbedBuilderService: DiscordEmbedBuilderService,
    @InjectDiscordClient() private readonly discordClient: Discord.Client
  ) {}

  async create({ commsId, type, context, options }: DiscordMessageDto): Promise<void> {
    const embedBuilder = this.discordEmbedBuilderService.getBuilderByType(type);
    if (!embedBuilder) {
      throw new BadRequestException(`Embed builder not found for type ${type}`);
    }
    const channels = await this.getContractSubscriptions(context.nftCollateralContract, context.nftCollateralId);
    for (const channelId of channels) {
      const channel = await this.fetchChannel(channelId);
      if (!channel) continue;

      const hasAlreadyBeenSent = await this.notificationRepository.exists(commsId, type, channelId);

      if (hasAlreadyBeenSent && !options?.resend) {
        this.logger.debug(`Message(${commsId}) has already been sent to channel ${channelId}`);
        continue;
      }

      await this.notificationRepository.upsert({
        channel: NotificationChannel.Discord,
        key: commsId,
        template: type,
        recipient: channelId,
        context,
        sent: false
      });
      this.logger.log(`Message(${commsId}) created for channel ${channelId} with context ${JSON.stringify(context)}`);
    }
  }

  async sendPendingNotifications(): Promise<void> {
    for await (const comm of this.notificationRepository.iterateOverPendingPerChannel(NotificationChannel.Discord)) {
      try {
        await this.send(comm as DiscordComms);
      } catch {}
    }
  }

  async send(comms: DiscordComms): Promise<void> {
    const embedBuilder = this.discordEmbedBuilderService.getBuilderByType(comms.template as DiscordMessageType);
    if (!embedBuilder) {
      this.logger.error(`Embed builder not found for type ${comms.template}`);
      return;
    }

    const channel = await this.fetchChannel(comms.recipient);
    if (!channel) {
      return await this.deleteSubscriptionByChannelId(comms.recipient);
    }

    try {
      await (channel as Discord.TextChannel).send({ embeds: [embedBuilder(comms.context)] });
      await this.notificationRepository.markAsSent(comms);
      this.logger.log(`Message(${comms.key}) sent to channel ${comms.recipient}`);
    } catch (error) {
      this.logger.error(`Error sending message to channel ${comms.recipient}: ${error.message}\n${error.stack}`);
    }
  }

  async getPrefixByChannelId(channelId: string): Promise<string> {
    const subs = await this.subscriptionRepository.findByChannelId(channelId);
    return subs?.prefix || DEFAULT_PREFIX;
  }

  async deleteSubscriptionByChannelId(channelId: string): Promise<void> {
    await this.notificationRepository.deleteNotSentByRecipient(channelId);
    const subs = await this.subscriptionRepository.findByChannelId(channelId);
    if (subs && subs.channelId) {
      await this.subscriptionRepository.delete(subs);
    }
    this.logger.log(`Deleted subscriptions and pending notifications for channel ${channelId}`);
  }

  private async getContractSubscriptions(nftContract: string, nftId: string): Promise<string[]> {
    const subscriberChannelIds: string[] = [];
    for await (const sub of this.subscriptionRepository.iterate()) {
      const subscribed = sub.inputs.find(value => {
        const parsedInput = this.parseUserInput(value);
        if (parsedInput.type === SubscriptionType.AllContracts) {
          return parsedInput.contract === '*';
        }
        if (parsedInput.type === SubscriptionType.SingleContract) {
          return parsedInput.contract === nftContract.toLowerCase();
        }
        if (parsedInput.type === SubscriptionType.SingleContractSingleItem) {
          return parsedInput.contract === nftContract.toLowerCase() && !!parsedInput.item && parsedInput.item === nftId
            ? true
            : false;
        }
        if (parsedInput.type === SubscriptionType.SingleContractRanged) {
          return parsedInput.contract === nftContract.toLowerCase() &&
            !!parsedInput.bottom &&
            !!parsedInput.top &&
            parsedInput.bottom <= parseInt(nftId) &&
            parsedInput.top >= parseInt(nftId)
            ? true
            : false;
        }
        if (parsedInput.type === SubscriptionType.SingleContractRangeTopBound) {
          return parsedInput.contract === nftContract.toLowerCase() &&
            !!parsedInput.top &&
            parsedInput.top >= parseInt(nftId)
            ? true
            : false;
        }
        if (parsedInput.type === SubscriptionType.SingleContractRangeBottomBound) {
          return parsedInput.contract === nftContract.toLowerCase() &&
            !!parsedInput.bottom &&
            parsedInput.bottom <= parseInt(nftId)
            ? true
            : false;
        }
      });
      if (subscribed) subscriberChannelIds.push(sub.channelId);
    }

    return subscriberChannelIds;
  }

  private async fetchChannel(channelId: string): Promise<Discord.Channel | null> {
    try {
      return await this.discordClient.channels.fetch(channelId);
    } catch (error) {
      if (error instanceof DiscordAPIError && [10003, 50001, 50013].includes(Number(error.code))) {
        this.logger.warn(
          `Channel ${channelId} is not accessible to bot (DiscordAPIError ${error.code}: ${error.message}). Cleaning stale subscription.`
        );
        await this.deleteSubscriptionByChannelId(channelId);
        return null;
      }

      this.logger.error(`Failed to fetch channel ${channelId}: ${String(error)}`);
      return null;
    }
  }

  parseUserInput(input: string): UserInput {
    // Input Validation
    const contractRanged = /(^[a-zA-Z0-9]+):([0-9]+\.{2}[0-9]+)/g;
    const contractRangeTopBound = /(^[a-zA-Z0-9]+):(\.{2}[0-9]+)/g;
    const contractRangeBottomBound = /(^[a-zA-Z0-9]+):([0-9]+\.{2}$)/g;
    const contractRangeSingular = /(^[a-zA-Z0-9]+):([0-9]+$)/g;
    const contractOnly = /(^[a-zA-Z0-9]+)+$/g;
    const all = /^\*{1}$/g;

    if (all.exec(input)) {
      return {
        type: SubscriptionType.AllContracts,
        contract: '*'
      };
    } else if (contractOnly.exec(input)) {
      return {
        type: SubscriptionType.SingleContract,
        contract: input.toLowerCase() // (Input == Contract ID)
      };
    } else if (contractRangeSingular.exec(input)) {
      const [contract, item] = input.split(':');
      return {
        type: SubscriptionType.SingleContractSingleItem,
        contract: contract.toLowerCase(),
        item // Do not ParseInt because it can be a huge int string
      };
    } else if (contractRanged.exec(input)) {
      const [contract, bottom, top] = this.parseContractAndRange(input);
      return {
        type: SubscriptionType.SingleContractRanged,
        contract: contract.toLowerCase(),
        top: parseInt(top), // No choice but to parseInt, only way to do comparisons
        bottom: parseInt(bottom) // No choice but to parseInt, only way to do comparisons
      };
    } else if (contractRangeTopBound.exec(input)) {
      const [contract, bottom, top] = this.parseContractAndRange(input);
      return {
        type: SubscriptionType.SingleContractRangeTopBound,
        contract: contract.toLowerCase(),
        top: parseInt(top), // No choice but to parseInt, only way to do comparisons
        bottom: parseInt(bottom) // No choice but to parseInt, only way to do comparisons
      };
    } else if (contractRangeBottomBound.exec(input)) {
      const [contract, bottom, top] = this.parseContractAndRange(input);
      return {
        type: SubscriptionType.SingleContractRangeBottomBound,
        contract: contract.toLowerCase(),
        top: parseInt(top), // No choice but to parseInt, only way to do comparisons
        bottom: parseInt(bottom) // No choice but to parseInt, only way to do comparisons
      };
    }

    return null;
  }

  private parseContractAndRange(input: string): [string, string, string] {
    const [contract, item] = input.split(':');
    const [bottomRange, topRange] = item.split('..');
    return [contract, bottomRange, topRange];
  }
}
