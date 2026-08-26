import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import {
  IsEthereumAddress,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested
} from 'class-validator';

export class DiscordMessageContextDto {
  @Expose()
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ type: String })
  assetUrl: string;

  @Expose()
  @IsEthereumAddress()
  @ApiProperty({ type: String })
  nftCollateralContract: string;

  @Expose()
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ type: String })
  nftCollateralId: string;

  @Expose()
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  @ApiProperty({ type: String })
  assetCategory?: string;

  @Expose()
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  @ApiProperty({ type: String })
  assetName?: string;
}

export class DiscordMessageCurrencyContextDto {
  @Expose()
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ type: String })
  ticker: string;
}

export class DiscordMessageLoanContextDto extends DiscordMessageContextDto {
  @Expose()
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ type: String })
  imagePreviewUrl: string;

  @Expose()
  @Type(() => Number)
  @IsNumber()
  @ApiProperty({ type: Number })
  principal: number;

  @Expose()
  @Type(() => Number)
  @IsNumber()
  @ApiProperty({ type: Number })
  repayment: number;

  @Expose()
  @Type(() => DiscordMessageCurrencyContextDto)
  @IsObject()
  @ValidateNested()
  @ApiProperty({ type: DiscordMessageCurrencyContextDto })
  currency: DiscordMessageCurrencyContextDto;

  @Expose()
  @Type(() => Number)
  @IsInt()
  @ApiProperty({ type: Number })
  durationDays: number;
}

export class DiscordMessageNewListingContextDto extends DiscordMessageContextDto {
  @Expose()
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ type: String })
  imageUrl: string;
}

export class DiscordMessageNewOfferContextDto extends DiscordMessageLoanContextDto {}

export class DiscordMessageLoanStartedContextDto extends DiscordMessageLoanContextDto {}

export class DiscordMessageLoanRepaidContextDto extends DiscordMessageLoanContextDto {}

export class DiscordMessageLoanLiquidatedContextDto extends DiscordMessageLoanContextDto {}
