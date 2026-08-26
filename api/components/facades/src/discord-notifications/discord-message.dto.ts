import { Type as ClassType } from '@nestjs/common';
import { ApiExtraModels, ApiProperty, getSchemaPath } from '@nestjs/swagger';
import { Expose, Type, TypeHelpOptions } from 'class-transformer';
import { IsEnum, IsNotEmpty, IsObject, IsOptional, IsString, ValidateNested } from 'class-validator';
import {
  DiscordMessageNewListingContextDto,
  DiscordMessageNewOfferContextDto,
  DiscordMessageLoanStartedContextDto,
  DiscordMessageLoanLiquidatedContextDto,
  DiscordMessageLoanRepaidContextDto
} from './discord-message-context.dto';
import { DiscordMessageOptions } from './discord-message-options.dto';

export enum DiscordMessageType {
  NewListing = 'new-listing',
  NewOffer = 'new-offer',
  LoanStarted = 'loan-started',
  LoanRepaid = 'loan-repaid',
  LoanLiquidated = 'loan-liquidated'
}

const detectType = ({ object }: TypeHelpOptions): ClassType => {
  switch ((object as DiscordMessageDto).type) {
    case DiscordMessageType.NewListing:
      return DiscordMessageNewListingContextDto;

    case DiscordMessageType.NewOffer:
      return DiscordMessageNewOfferContextDto;

    case DiscordMessageType.LoanStarted:
      return DiscordMessageLoanStartedContextDto;

    case DiscordMessageType.LoanRepaid:
      return DiscordMessageLoanRepaidContextDto;

    case DiscordMessageType.LoanLiquidated:
      return DiscordMessageLoanLiquidatedContextDto;
  }
};

@ApiExtraModels(
  DiscordMessageNewListingContextDto,
  DiscordMessageNewOfferContextDto,
  DiscordMessageLoanStartedContextDto,
  DiscordMessageLoanRepaidContextDto,
  DiscordMessageLoanLiquidatedContextDto
)
export class DiscordMessageDto {
  @Expose()
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ type: String })
  commsId: string;

  @Expose()
  @IsEnum(DiscordMessageType)
  @ApiProperty({ enum: DiscordMessageType })
  type: DiscordMessageType;

  @Expose()
  @Type(detectType)
  @IsObject()
  @ValidateNested()
  @ApiProperty({
    oneOf: [
      { $ref: getSchemaPath(DiscordMessageNewListingContextDto) },
      { $ref: getSchemaPath(DiscordMessageNewOfferContextDto) },
      { $ref: getSchemaPath(DiscordMessageLoanStartedContextDto) },
      { $ref: getSchemaPath(DiscordMessageLoanRepaidContextDto) },
      { $ref: getSchemaPath(DiscordMessageLoanLiquidatedContextDto) }
    ]
  })
  context:
    | DiscordMessageNewListingContextDto
    | DiscordMessageNewOfferContextDto
    | DiscordMessageLoanStartedContextDto
    | DiscordMessageLoanRepaidContextDto
    | DiscordMessageLoanLiquidatedContextDto;

  @Expose()
  @Type(() => DiscordMessageOptions)
  @ValidateNested()
  @IsObject()
  @IsOptional()
  @ApiProperty({ type: DiscordMessageOptions })
  options?: DiscordMessageOptions;
}
