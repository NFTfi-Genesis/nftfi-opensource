import {
  DiscordMessageDto,
  DiscordMessageLoanLiquidatedContextDto,
  DiscordMessageLoanRepaidContextDto,
  DiscordMessageLoanStartedContextDto,
  DiscordMessageNewListingContextDto,
  DiscordMessageNewOfferContextDto,
  DiscordMessageType
} from '@nftfi.api/facades/discord-notifications';
import { Notification } from '@nftfi.api/repositories/postgres/notification';

export type DiscordComms = Notification<DiscordMessageDto['context']>;

export enum SubscriptionType {
  AllContracts = 'allContracts',
  SingleContract = 'singleContract',
  SingleContractSingleItem = 'singleContractSingleItem',
  SingleContractRanged = 'singleContractRanged',
  SingleContractRangeTopBound = 'singleContractRangeTopBound',
  SingleContractRangeBottomBound = 'singleContractRangeBottomBound'
}

export enum CommandType {
  Help = 'help',
  View = 'view',
  SetPrefix = 'newprefix',
  Subscribe = 'subscribe',
  Unsubscribe = 'unsubscribe'
}

export interface UserInput {
  type: SubscriptionType;
  contract: string;
  item?: string;
  bottom?: number;
  top?: number;
}

export const DEFAULT_PREFIX = '!';

export type SendDiscordMessagePayload = Pick<DiscordMessageDto, 'commsId'> &
  (
    | {
        type: DiscordMessageType.NewListing;
        context: DiscordMessageNewListingContextDto;
      }
    | {
        type: DiscordMessageType.NewOffer;
        context: DiscordMessageNewOfferContextDto;
      }
    | {
        type: DiscordMessageType.LoanStarted;
        context: DiscordMessageLoanStartedContextDto;
      }
    | {
        type: DiscordMessageType.LoanRepaid;
        context: DiscordMessageLoanRepaidContextDto;
      }
    | {
        type: DiscordMessageType.LoanLiquidated;
        context: DiscordMessageLoanLiquidatedContextDto;
      }
  );
