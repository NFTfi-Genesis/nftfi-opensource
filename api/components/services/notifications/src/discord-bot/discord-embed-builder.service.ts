import { Injectable } from '@nestjs/common';
import { isNil } from 'lodash';
import Discord from 'discord.js';
import {
  DiscordMessageLoanLiquidatedContextDto,
  DiscordMessageLoanRepaidContextDto,
  DiscordMessageNewListingContextDto,
  DiscordMessageLoanStartedContextDto,
  DiscordMessageNewOfferContextDto,
  DiscordMessageType,
  DiscordMessageDto
} from '@nftfi.api/facades/discord-notifications';

@Injectable()
export class DiscordEmbedBuilderService {
  private readonly embeds: Record<DiscordMessageType, (context: DiscordMessageDto['context']) => Discord.EmbedBuilder> =
    {
      [DiscordMessageType.NewListing]: this.buildNewListingEmbed.bind(this),
      [DiscordMessageType.NewOffer]: this.buildNewOfferEmbed.bind(this),
      [DiscordMessageType.LoanStarted]: this.buildLoanStartedEmbed.bind(this),
      [DiscordMessageType.LoanRepaid]: this.buildLoanRepaidEmbed.bind(this),
      [DiscordMessageType.LoanLiquidated]: this.buildLoanLiquidatedEmbed.bind(this)
    };

  getBuilderByType(type: DiscordMessageType): (context: DiscordMessageDto['context']) => Discord.EmbedBuilder {
    return this.embeds[type];
  }

  private buildNewListingEmbed(context: DiscordMessageNewListingContextDto): Discord.EmbedBuilder {
    return new Discord.EmbedBuilder()
      .setColor('#38FFA6')
      .setTitle(`New Listing!`)
      .setURL(context.assetUrl)
      .setDescription(`${this.nameNullCatch(context)}\r\n\r\n**[Make an offer](${context.assetUrl})**`)
      .setImage(context.imageUrl);
  }

  private buildNewOfferEmbed(context: DiscordMessageNewOfferContextDto): Discord.EmbedBuilder {
    return new Discord.EmbedBuilder()
      .setColor('#3affff')
      .setTitle(`New Offer`)
      .setDescription(`${this.nameNullCatch(context)}\r\n\r\n**[Make an offer](${context.assetUrl})**`)
      .setURL(context.assetUrl)
      .setThumbnail(context.imagePreviewUrl)
      .addFields(
        { name: 'Loan', value: `${context.principal} ${context.currency.ticker}`, inline: true },
        { name: 'Repayment', value: `${context.repayment} ${context.currency.ticker}`, inline: true },
        { name: 'Duration', value: `${context.durationDays} Days`, inline: true }
      );
  }

  private buildLoanStartedEmbed(context: DiscordMessageLoanStartedContextDto): Discord.EmbedBuilder {
    return new Discord.EmbedBuilder()
      .setColor('#dce769')
      .setTitle(`New Loan Started`)
      .setURL(context.assetUrl)
      .setDescription(`${this.nameNullCatch(context)}`)
      .setThumbnail(context.imagePreviewUrl)
      .setTimestamp()
      .addFields(
        { name: 'Loan', value: `${context.principal} ${context.currency.ticker}`, inline: true },
        { name: 'Repayment', value: `${context.repayment} ${context.currency.ticker}`, inline: true },
        { name: 'Duration', value: `${context.durationDays} Days`, inline: true }
      );
  }

  private buildLoanRepaidEmbed(context: DiscordMessageLoanRepaidContextDto): Discord.EmbedBuilder {
    return new Discord.EmbedBuilder()
      .setColor('#38FFA6')
      .setTitle(`Loan Repaid!`)
      .setDescription(`${this.nameNullCatch(context)}`)
      .setURL(context.assetUrl)
      .setThumbnail(context.imagePreviewUrl)
      .setTimestamp()
      .addFields(
        { name: 'Loan', value: `${context.principal} ${context.currency.ticker}`, inline: true },
        { name: 'Repayment', value: `${context.repayment} ${context.currency.ticker}`, inline: true },
        { name: 'Duration', value: `${context.durationDays} Days`, inline: true }
      );
  }

  private buildLoanLiquidatedEmbed(context: DiscordMessageLoanLiquidatedContextDto): Discord.EmbedBuilder {
    return new Discord.EmbedBuilder()
      .setColor('#FF51CA')
      .setTitle(`Loan Liquidated`)
      .setURL(context.assetUrl)
      .setDescription(`${this.nameNullCatch(context)}`)
      .setThumbnail(context.imagePreviewUrl)
      .setTimestamp()
      .addFields(
        { name: 'Loan', value: `${context.principal} ${context.currency.ticker}`, inline: true },
        { name: 'Repayment', value: `${context.repayment} ${context.currency.ticker}`, inline: true },
        { name: 'Duration', value: `${context.durationDays} Days`, inline: true }
      );
  }

  private nameNullCatch(data: { assetCategory?: string; assetName?: string }): string {
    const output: string[] = [];
    if (!isNil(data.assetCategory)) output.push(data.assetCategory);
    if (!isNil(data.assetName)) output.push(data.assetName);

    return output.join(' : ');
  }
}
